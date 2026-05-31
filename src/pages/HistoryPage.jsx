import { useEffect, useMemo, useState } from "react";
import RecordCard from "../components/RecordCard.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { api } from "../utils/api.js";
import { useToast } from "../components/Toast.jsx";
import { pushToastResult } from "../utils/feedback.js";

// 历史页：最新在上。可删除单条，删除需二次确认，删除后写回文件并同步 git。
export default function HistoryPage() {
  const [records, setRecords] = useState(null); // null = 加载中
  const [target, setTarget] = useState(null); // 待删除记录
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let alive = true;
    api
      .getRecords()
      .then((data) => {
        if (alive) setRecords(Array.isArray(data.records) ? data.records : []);
      })
      .catch((err) => {
        if (alive) setRecords([]);
        toast.show({ kind: "err", message: "读取记录失败", detail: err.message, duration: 6000 });
      });
    return () => {
      alive = false;
    };
  }, [toast]);

  // 保存时按升序存，展示时倒序：最新在最上。
  const reversed = useMemo(() => (records ? [...records].reverse() : []), [records]);

  async function confirmDelete() {
    if (!target) return;
    setDeleting(true);
    try {
      const res = await api.deleteRecord(target.id);
      setRecords((list) => (list || []).filter((r) => r.id !== target.id));
      setTarget(null);
      pushToastResult(toast, res, {
        synced: "已删除并同步",
        localOnly: "已删除（本地），但推送失败",
      });
    } catch (err) {
      toast.show({ kind: "err", message: "删除失败", detail: err.message, duration: 6000 });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">历史</h1>
        <p className="page__subtitle">这些是过去留下的状态快照。</p>
      </div>

      {records === null ? (
        <div className="empty">正在读取…</div>
      ) : reversed.length === 0 ? (
        <EmptyState title="还没有任何记录" hint="去「记录」页留下第一条状态吧。" />
      ) : (
        <div className="stack">
          {reversed.map((r) => (
            <RecordCard key={r.id} record={r} onDelete={setTarget} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!target}
        title="删除这条记录？"
        desc="它会从本地记录文件中移除，并在保存后同步到 Git 仓库。"
        cancelLabel="取消"
        confirmLabel="删除"
        busy={deleting}
        onCancel={() => (deleting ? null : setTarget(null))}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
