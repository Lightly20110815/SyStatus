// 温和的空状态。数据为空时不留尴尬的空白。
export default function EmptyState({ title = "这里还什么都没有", hint }) {
  return (
    <div className="empty">
      <div className="empty__title">{title}</div>
      {hint ? <div>{hint}</div> : null}
    </div>
  );
}
