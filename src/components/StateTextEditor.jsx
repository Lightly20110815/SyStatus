// 状态句子编辑器。AI（或本地 fallback）生成后填进可编辑文本框，最终保存的是编辑后的版本。
export default function StateTextEditor({
  value,
  onChange,
  onGenerate,
  generating,
  source,
  hasGenerated,
}) {
  let sourceText = "可以让系统生成一句，也可以自己写下这一刻。";
  if (generating) sourceText = "正在生成…";
  else if (source === "ai") sourceText = "由 AI 生成，可自由修改。";
  else if (source === "fallback") sourceText = "本地生成，可自由修改。";

  return (
    <div>
      <textarea
        className="textarea state-text"
        placeholder="这一刻的 Sy……"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="state-editor__meta">
        <span className={`source-tag${source === "ai" ? " source-tag--ai" : ""}`}>{sourceText}</span>
        <button type="button" className="btn btn--sm" onClick={onGenerate} disabled={generating}>
          {hasGenerated ? "重新生成" : "生成状态句子"}
        </button>
      </div>
    </div>
  );
}
