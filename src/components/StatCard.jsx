import { bandColor } from "../utils/colors.js";

// 统计数字卡。band=true 时用分数区间配色（如平均分），否则用普通色（如次数）。
export default function StatCard({ label, value, unit, band = false, score }) {
  const colored = band && typeof score === "number";
  const style = colored ? { "--band": bandColor(score) } : undefined;
  return (
    <div className="stat-card">
      <div className="stat-card__label">{label}</div>
      <div className={`stat-card__value${colored ? "" : " stat-card__value--plain"}`} style={style}>
        {value}
        {unit ? <span className="stat-card__unit">{unit}</span> : null}
      </div>
    </div>
  );
}
