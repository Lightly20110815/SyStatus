import { toLocalDisplay } from "../utils/time.js";
import { scoreBand } from "../utils/score.js";
import { bandColor } from "../utils/colors.js";

// 历史记录卡片。显示本地时间、最终分、状态句子、感受、影响因素。
// 没有影响因素时不显示空区域。
export default function RecordCard({ record, onDelete }) {
  const band = scoreBand(record.finalScore);
  const color = bandColor(record.finalScore);
  const hasFactors = Array.isArray(record.factors) && record.factors.length > 0;

  return (
    <div className="record-card">
      <div className="record-card__head">
        <div className="record-card__left">
          <span className="score-badge" style={{ "--band": color }}>
            {record.finalScore}
            <span className="score-badge__band">{band.label}</span>
          </span>
          <span className="record-time mono">{toLocalDisplay(record.createdAt)}</span>
        </div>
        <button
          type="button"
          className="btn btn--danger-ghost"
          onClick={() => onDelete(record)}
        >
          删除
        </button>
      </div>

      {record.stateText ? <p className="record-text">{record.stateText}</p> : null}

      {record.feelings && record.feelings.length ? (
        <div className="chip-row">
          {record.feelings.map((f) => (
            <span key={f} className="chip chip--feeling">
              {f}
            </span>
          ))}
        </div>
      ) : null}

      {hasFactors ? (
        <div className="chip-row">
          {record.factors.map((f) => (
            <span key={f} className="chip chip--factor">
              {f}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
