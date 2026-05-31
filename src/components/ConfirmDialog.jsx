import { useEffect } from "react";

// 通用二次确认对话框。文案、按钮、危险程度都由调用方传入。
export default function ConfirmDialog({
  open,
  title,
  desc,
  cancelLabel = "取消",
  confirmLabel = "删除",
  confirmKind = "danger",
  busy = false,
  onCancel,
  onConfirm,
}) {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === "Escape" && !busy) onCancel && onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="dialog-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel && onCancel();
      }}
    >
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title}>
        <h3 className="dialog__title">{title}</h3>
        {desc ? <p className="dialog__desc">{desc}</p> : null}
        <div className="dialog__actions">
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn btn--${confirmKind}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "处理中…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
