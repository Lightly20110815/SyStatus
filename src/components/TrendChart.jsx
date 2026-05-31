import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { bandColor } from "../utils/colors.js";
import { scoreBand } from "../utils/score.js";

// 注意：SVG 的 stroke/fill 不解析 CSS 变量，这里用与主题一致的十六进制色值。
const C = {
  accent: "#6a8a93",
  grid: "#e7e5df",
  tick: "#9b978d",
  surface: "#fffffe",
};

function ScoreDot(props) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || payload.score == null) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={3.6}
      fill={bandColor(payload.score)}
      stroke={C.surface}
      strokeWidth={1.5}
    />
  );
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  if (p.score == null) return null;
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-strong)",
        borderRadius: 8,
        padding: "6px 10px",
        fontSize: 12.5,
        boxShadow: "var(--shadow-pop)",
      }}
    >
      <div style={{ color: "var(--ink-3)" }}>{p.label}</div>
      <div style={{ fontWeight: 600 }}>
        {p.score} · {scoreBand(p.score).label}
      </div>
    </div>
  );
}

// data: [{ label, score }]，score 可能为 null（无记录的天不补 0，曲线断开）。
export default function TrendChart({ data }) {
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 14, left: -16, bottom: 2 }}>
          <CartesianGrid stroke={C.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: C.tick }}
            axisLine={{ stroke: C.grid }}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fontSize: 11, fill: C.tick }}
            axisLine={false}
            tickLine={false}
            width={34}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: C.grid }} />
          <Line
            type="monotone"
            dataKey="score"
            stroke={C.accent}
            strokeWidth={2}
            dot={<ScoreDot />}
            activeDot={{ r: 5, fill: C.accent }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
