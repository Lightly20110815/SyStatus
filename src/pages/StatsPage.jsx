import { useEffect, useMemo, useState } from "react";
import StatCard from "../components/StatCard.jsx";
import TrendChart from "../components/TrendChart.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { api } from "../utils/api.js";
import { computeStats } from "../utils/stats.js";
import { useToast } from "../components/Toast.jsx";

const RANGES = [
  { key: "today", label: "今天" },
  { key: "week", label: "本周" },
  { key: "month", label: "本月" },
];

function FreqList({ title, items }) {
  return (
    <section className="section">
      <div className="section__title">
        <span>{title}</span>
      </div>
      {items.length === 0 ? (
        <div className="muted-note">暂无数据</div>
      ) : (
        <div className="freq-list">
          {items.map((it) => (
            <span key={it.label} className="freq-item">
              {it.label}
              <span className="freq-item__count">×{it.count}</span>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

// 统计页：今天 / 本周 / 本月。平均分、状态曲线、记录次数、高频感受、高频影响因素。
export default function StatsPage() {
  const [records, setRecords] = useState(null);
  const [range, setRange] = useState("today");
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

  const stats = useMemo(
    () => (records ? computeStats(records, range) : null),
    [records, range]
  );

  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">统计</h1>
        <p className="page__subtitle">只看趋势，不下结论。</p>
      </div>

      <div className="tabs" role="tablist">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            role="tab"
            aria-selected={range === r.key}
            className={`tab${range === r.key ? " tab--active" : ""}`}
            onClick={() => setRange(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {stats === null ? (
        <div className="empty">正在读取…</div>
      ) : (
        <div className="stack">
          <div className="stat-grid">
            <StatCard
              label="平均分"
              value={stats.average === null ? "暂无记录" : stats.average}
              band={stats.average !== null}
              score={stats.average ?? undefined}
            />
            <StatCard label="记录次数" value={stats.count} unit={stats.count ? "次" : ""} />
          </div>

          <section className="section">
            <div className="section__title">
              <span>状态曲线</span>
            </div>
            {stats.count > 0 ? (
              <div className="card">
                <TrendChart data={stats.series} />
              </div>
            ) : (
              <div className="muted-note">这个范围还没有记录，曲线暂时是空的。</div>
            )}
          </section>

          <FreqList title="高频感受" items={stats.topFeelings} />
          <FreqList title="高频影响因素" items={stats.topFactors} />

          {stats.count === 0 ? (
            <EmptyState
              title="这个范围还没有记录"
              hint="换个范围看看，或去「记录」页留下新的状态。"
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
