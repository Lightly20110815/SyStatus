// 标签选择器，感受与影响因素共用。长标签自动换行，达到上限后禁用未选项。
export default function TagPicker({
  options,
  selected,
  onChange,
  max,
  atMaxHint,
  emptyOptionsHint,
}) {
  const selectedSet = new Set(selected);
  const atMax = selected.length >= max;

  function toggle(label) {
    if (selectedSet.has(label)) {
      onChange(selected.filter((l) => l !== label));
    } else {
      if (atMax) return;
      onChange([...selected, label]);
    }
  }

  if (!options.length && emptyOptionsHint) {
    return <div className="muted-note">{emptyOptionsHint}</div>;
  }

  return (
    <div>
      <div className="tag-grid">
        {options.map((label) => {
          const isSel = selectedSet.has(label);
          return (
            <button
              key={label}
              type="button"
              className={`tag${isSel ? " tag--selected" : ""}`}
              aria-pressed={isSel}
              disabled={!isSel && atMax}
              onClick={() => toggle(label)}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="tag-meta">
        <span>已选 {selected.length} 个</span>
        {atMax ? <span className="tag-meta__limit">{atMaxHint}</span> : null}
      </div>
    </div>
  );
}
