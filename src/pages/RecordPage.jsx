import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TagPicker from "../components/TagPicker.jsx";
import ScoreAdjuster from "../components/ScoreAdjuster.jsx";
import StateTextEditor from "../components/StateTextEditor.jsx";
import { DEFAULT_FEELINGS } from "../data/defaultFeelings.js";
import { DEFAULT_FACTORS } from "../data/defaultFactors.js";
import { buildFeelingScoreMap, estimateScore, computeFinalScore } from "../utils/score.js";
import { api } from "../utils/api.js";
import { useToast } from "../components/Toast.jsx";
import { pushToastResult } from "../utils/feedback.js";

const MAX_FEELINGS = 6;
const MAX_FACTORS = 10;

// 记录流程：选感受 → 选影响因素 → 估算分 → 微调 → 状态句子 → 编辑 → 保存。
export default function RecordPage() {
  const [settings, setSettings] = useState({ customFeelings: [], customFactors: [] });
  const [feelings, setFeelings] = useState([]);
  const [factors, setFactors] = useState([]);
  const [adjust, setAdjust] = useState(0);
  const [stateText, setStateText] = useState("");
  const [stateSource, setStateSource] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => {
      /* 读取失败时仍可用默认标签记录 */
    });
  }, []);

  const feelingOptions = useMemo(
    () => [...DEFAULT_FEELINGS.map((f) => f.label), ...settings.customFeelings.map((f) => f.label)],
    [settings]
  );
  const factorOptions = useMemo(
    () => [...DEFAULT_FACTORS, ...settings.customFactors],
    [settings]
  );
  const feelingScoreMap = useMemo(
    () => buildFeelingScoreMap(settings.customFeelings),
    [settings]
  );

  const estimate = useMemo(() => estimateScore(feelings, feelingScoreMap), [feelings, feelingScoreMap]);
  const finalScore = computeFinalScore(estimate, adjust);
  const hasFeelings = feelings.length >= 1;

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await api.aiStateText({ finalScore, feelings, factors });
      setStateText(res.text);
      setStateSource(res.source);
      setHasGenerated(true);
    } catch {
      // 连本地服务都不可达时的最后兜底，保证功能不坏。
      setStateText("这一刻的 Sy 先被记录下来就好。");
      setStateSource("fallback");
      setHasGenerated(true);
    } finally {
      setGenerating(false);
    }
  }

  function resetForm() {
    setFeelings([]);
    setFactors([]);
    setAdjust(0);
    setStateText("");
    setStateSource(null);
    setHasGenerated(false);
  }

  async function handleSave() {
    if (!hasFeelings || saving) return;
    setSaving(true);
    try {
      const res = await api.addRecord({
        finalScore,
        feelings,
        factors,
        stateText: stateText.trim(),
      });
      resetForm();
      pushToastResult(toast, res, {
        synced: "已保存并同步",
        localOnly: "已保存到本地，但推送失败",
      });
    } catch (err) {
      toast.show({ kind: "err", message: "保存失败", detail: err.message, duration: 6000 });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">记录这一刻</h1>
        <p className="page__subtitle">不用写很多，留下这一瞬间的状态就够了。</p>
      </div>

      <div className="stack">
        <section className="section">
          <div className="section__title">
            <span>此刻的感受</span>
            <span className="section__hint">必选，1–6 个</span>
          </div>
          <TagPicker
            options={feelingOptions}
            selected={feelings}
            onChange={setFeelings}
            max={MAX_FEELINGS}
            atMaxHint="已经够描述这一刻了"
          />
        </section>

        <section className="section">
          <div className="section__title">
            <span>影响因素</span>
            <span className="section__hint">可不选，最多 10 个</span>
          </div>
          <TagPicker
            options={factorOptions}
            selected={factors}
            onChange={setFactors}
            max={MAX_FACTORS}
            atMaxHint="影响因素已经够多了"
          />
        </section>

        {hasFeelings ? (
          <section className="section">
            <div className="section__title">
              <span>这一刻的分数</span>
              <span className="section__hint">可上下微调</span>
            </div>
            <ScoreAdjuster estimate={estimate} adjust={adjust} onAdjustChange={setAdjust} />
          </section>
        ) : null}

        {hasFeelings ? (
          <section className="section">
            <div className="section__title">
              <span>状态句子</span>
            </div>
            <StateTextEditor
              value={stateText}
              onChange={setStateText}
              onGenerate={handleGenerate}
              generating={generating}
              source={stateSource}
              hasGenerated={hasGenerated}
            />
          </section>
        ) : null}

        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={!hasFeelings || saving}
          onClick={handleSave}
        >
          {saving ? "保存中…" : "保存这一刻"}
        </button>

        {!hasFeelings ? (
          <p className="muted-note" style={{ textAlign: "center" }}>
            先选至少一个感受，分数和状态句子会随之出现。
          </p>
        ) : (
          <p className="muted-note" style={{ textAlign: "center" }}>
            保存后会写入本地文件并自动提交。也可以去 <Link to="/history">历史</Link> 看看过去的记录。
          </p>
        )}
      </div>
    </div>
  );
}
