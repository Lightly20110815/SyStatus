import { useEffect, useMemo, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { DEFAULT_FEELINGS } from "../data/defaultFeelings.js";
import { DEFAULT_FACTORS } from "../data/defaultFactors.js";
import { api } from "../utils/api.js";
import { useToast } from "../components/Toast.jsx";
import { pushToastResult } from "../utils/feedback.js";

function clampWeight(n) {
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const toast = useToast();

  // 新增感受
  const [fLabel, setFLabel] = useState("");
  const [fWeight, setFWeight] = useState("");
  const [fError, setFError] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [pending, setPending] = useState(null); // { label, source }
  const [pendingScore, setPendingScore] = useState(""); // 字符串，允许临时为空
  const [savingFeeling, setSavingFeeling] = useState(false);

  // 新增影响因素
  const [xLabel, setXLabel] = useState("");
  const [xError, setXError] = useState("");
  const [savingFactor, setSavingFactor] = useState(false);

  // 删除
  const [del, setDel] = useState(null); // { type, label }
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api
      .getSettings()
      .then(setSettings)
      .catch((err) => {
        setSettings({ customFeelings: [], customFactors: [] });
        toast.show({ kind: "err", message: "读取设置失败", detail: err.message, duration: 6000 });
      });
  }, [toast]);

  const feelingLabels = useMemo(() => {
    const custom = settings ? settings.customFeelings.map((f) => f.label) : [];
    return new Set([...DEFAULT_FEELINGS.map((f) => f.label), ...custom]);
  }, [settings]);

  const factorLabels = useMemo(() => {
    const custom = settings ? settings.customFactors : [];
    return new Set([...DEFAULT_FACTORS, ...custom]);
  }, [settings]);

  // ---- 新增感受流程 ----
  async function startAddFeeling() {
    const label = fLabel.trim();
    if (!label) {
      setFError("请输入感受名称");
      return;
    }
    if (feelingLabels.has(label)) {
      setFError("这个感受已经存在");
      return;
    }
    setFError("");

    const w = fWeight.trim();
    if (w !== "") {
      const n = clampWeight(Number(w));
      if (n === null) {
        setFError("权重需要是 0–100 的数字");
        return;
      }
      setPending({ label, source: "manual" });
      setPendingScore(String(n));
      return;
    }

    // 留空 → 调 AI 估权重
    setAiBusy(true);
    try {
      const res = await api.aiFeelingScore(label);
      setPending({ label, source: res.source });
      setPendingScore(String(res.baseScore));
    } catch {
      setPending({ label, source: "fallback" });
      setPendingScore("50");
    } finally {
      setAiBusy(false);
    }
  }

  function cancelPending() {
    setPending(null);
    setPendingScore("");
    setFError("");
  }

  async function confirmFeeling() {
    if (!pending) return;
    const w = pendingScore.trim();
    if (w === "") {
      setFError("需要填写权重");
      return;
    }
    const n = clampWeight(Number(w));
    if (n === null) {
      setFError("权重需要是 0–100 的数字");
      return;
    }
    setSavingFeeling(true);
    try {
      const res = await api.addCustomFeeling(pending.label, n);
      setSettings(res.settings);
      setPending(null);
      setPendingScore("");
      setFLabel("");
      setFWeight("");
      setFError("");
      pushToastResult(toast, res, { synced: "已添加感受 · 已同步", localOnly: "已添加感受（本地），推送失败" });
    } catch (err) {
      setFError(err.message || "保存失败");
    } finally {
      setSavingFeeling(false);
    }
  }

  // ---- 新增影响因素 ----
  async function addFactor() {
    const label = xLabel.trim();
    if (!label) {
      setXError("请输入影响因素名称");
      return;
    }
    if (factorLabels.has(label)) {
      setXError("这个影响因素已经存在");
      return;
    }
    setXError("");
    setSavingFactor(true);
    try {
      const res = await api.addCustomFactor(label);
      setSettings(res.settings);
      setXLabel("");
      pushToastResult(toast, res, { synced: "已添加影响因素 · 已同步", localOnly: "已添加影响因素（本地），推送失败" });
    } catch (err) {
      setXError(err.message || "保存失败");
    } finally {
      setSavingFactor(false);
    }
  }

  // ---- 删除 ----
  async function confirmDelete() {
    if (!del) return;
    setDeleting(true);
    try {
      const res =
        del.type === "feeling"
          ? await api.deleteCustomFeeling(del.label)
          : await api.deleteCustomFactor(del.label);
      setSettings(res.settings);
      setDel(null);
      pushToastResult(toast, res, { synced: "已删除 · 已同步", localOnly: "已删除（本地），推送失败" });
    } catch (err) {
      toast.show({ kind: "err", message: "删除失败", detail: err.message, duration: 6000 });
    } finally {
      setDeleting(false);
    }
  }

  if (!settings) {
    return (
      <div className="page">
        <div className="empty">正在读取…</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">设置</h1>
        <p className="page__subtitle">默认标签不可改；自定义标签可新增、可删除，删除不影响历史记录。</p>
      </div>

      {/* 感受标签 */}
      <section className="section">
        <div className="section__title">
          <span>感受标签</span>
          <span className="section__hint">默认 {DEFAULT_FEELINGS.length} 个</span>
        </div>
        <div className="card stack">
          <div>
            <div className="muted-note" style={{ marginTop: 0, marginBottom: 8 }}>默认（只读）</div>
            <div className="setting-list">
              {DEFAULT_FEELINGS.map((f) => (
                <span key={f.label} className="setting-chip setting-chip--readonly">
                  {f.label}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="muted-note" style={{ marginTop: 0, marginBottom: 8 }}>自定义</div>
            {settings.customFeelings.length === 0 ? (
              <div className="muted-note" style={{ marginTop: 0 }}>还没有自定义感受。</div>
            ) : (
              <div className="setting-list">
                {settings.customFeelings.map((f) => (
                  <span key={f.label} className="setting-chip">
                    {f.label}
                    <button
                      type="button"
                      className="setting-chip__del"
                      aria-label={`删除 ${f.label}`}
                      onClick={() => setDel({ type: "feeling", label: f.label })}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* 新增感受 */}
            <div className="add-row">
              <input
                className="input"
                placeholder="新感受名称"
                value={fLabel}
                onChange={(e) => {
                  setFLabel(e.target.value);
                  if (fError) setFError("");
                }}
                disabled={!!pending || aiBusy}
              />
              <input
                className="input input--num"
                placeholder="权重"
                inputMode="numeric"
                value={fWeight}
                onChange={(e) => setFWeight(e.target.value)}
                disabled={!!pending || aiBusy}
                title="0–100，留空则由 AI 估算"
              />
              <button
                type="button"
                className="btn"
                onClick={startAddFeeling}
                disabled={!!pending || aiBusy}
              >
                {aiBusy ? "AI 估算中…" : "添加"}
              </button>
            </div>
            <div className="muted-note" style={{ marginTop: 8 }}>
              权重 0–100，仅用于内部估分、不在记录里显示。留空则由 AI 参考默认体系分配，之后可再调整。
            </div>
            {fError && !pending ? <div className="field-error">{fError}</div> : null}

            {/* 权重确认面板 */}
            {pending ? (
              <div className="weight-confirm">
                <div className="weight-confirm__head">
                  <span className="weight-confirm__title">{pending.label}</span>
                  {pending.source === "fallback" ? <span className="pending-tag">待校准</span> : null}
                  {pending.source === "ai" ? <span className="source-tag source-tag--ai">AI 估算，可修改</span> : null}
                </div>
                <div className="weight-row">
                  <input
                    className="input input--num"
                    inputMode="numeric"
                    value={pendingScore}
                    onChange={(e) => setPendingScore(e.target.value)}
                    onBlur={() => {
                      const t = pendingScore.trim();
                      if (t === "") return;
                      const n = clampWeight(Number(t));
                      if (n !== null) setPendingScore(String(n));
                    }}
                  />
                  <input
                    className="slider"
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={Number(pendingScore) || 0}
                    onChange={(e) => setPendingScore(e.target.value)}
                    aria-label="调整权重"
                  />
                </div>
                {fError && pending ? <div className="field-error">{fError}</div> : null}
                <div className="dialog__actions" style={{ marginTop: 14 }}>
                  <button type="button" className="btn" onClick={cancelPending} disabled={savingFeeling}>
                    取消
                  </button>
                  <button type="button" className="btn btn--primary" onClick={confirmFeeling} disabled={savingFeeling}>
                    {savingFeeling ? "保存中…" : "确认保存"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* 影响因素 */}
      <section className="section">
        <div className="section__title">
          <span>影响因素</span>
          <span className="section__hint">默认 {DEFAULT_FACTORS.length} 个</span>
        </div>
        <div className="card stack">
          <div>
            <div className="muted-note" style={{ marginTop: 0, marginBottom: 8 }}>默认（只读）</div>
            <div className="setting-list">
              {DEFAULT_FACTORS.map((f) => (
                <span key={f} className="setting-chip setting-chip--readonly">
                  {f}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="muted-note" style={{ marginTop: 0, marginBottom: 8 }}>自定义</div>
            {settings.customFactors.length === 0 ? (
              <div className="muted-note" style={{ marginTop: 0 }}>还没有自定义影响因素。</div>
            ) : (
              <div className="setting-list">
                {settings.customFactors.map((f) => (
                  <span key={f} className="setting-chip">
                    {f}
                    <button
                      type="button"
                      className="setting-chip__del"
                      aria-label={`删除 ${f}`}
                      onClick={() => setDel({ type: "factor", label: f })}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="add-row">
              <input
                className="input"
                placeholder="新影响因素名称"
                value={xLabel}
                onChange={(e) => {
                  setXLabel(e.target.value);
                  if (xError) setXError("");
                }}
                disabled={savingFactor}
              />
              <button type="button" className="btn" onClick={addFactor} disabled={savingFactor}>
                {savingFactor ? "添加中…" : "添加"}
              </button>
            </div>
            <div className="muted-note" style={{ marginTop: 8 }}>影响因素不参与估分，只参与记录和统计。</div>
            {xError ? <div className="field-error">{xError}</div> : null}
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={!!del}
        title={del && del.type === "feeling" ? "删除这个感受标签？" : "删除这个影响因素？"}
        desc="它不会影响已经保存的历史记录，只会从之后的记录选项里移除。"
        cancelLabel="取消"
        confirmLabel="删除"
        busy={deleting}
        onCancel={() => (deleting ? null : setDel(null))}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
