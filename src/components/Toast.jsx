import { createContext, useContext, useCallback, useState, useRef } from "react";

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast 必须在 ToastProvider 内使用");
  return ctx;
}

// 轻量 toast：克制的样式，错误详情可折叠查看，主 UI 不被吓人的错误占据。
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (toast) => {
      const id = ++idRef.current;
      const t = { id, kind: "ok", duration: 3200, ...toast };
      setToasts((list) => [...list, t]);
      if (t.duration > 0) {
        setTimeout(() => dismiss(id), t.duration);
      }
      return id;
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.kind}`} role="status" onClick={() => dismiss(t.id)}>
            <div>{t.message}</div>
            {t.detail ? (
              <details className="toast__detail" onClick={(e) => e.stopPropagation()}>
                <summary>查看详情</summary>
                <pre>{t.detail}</pre>
              </details>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
