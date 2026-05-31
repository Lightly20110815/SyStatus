import { computeFinalScore, scoreBand, ADJUST_MIN, ADJUST_MAX } from "../utils/score.js";
import { bandColor } from "../utils/colors.js";

// 分数微调。只显示"最终分"——不显示估算分、不显示微调数值、不显示计算过程。
// 滑条用于在 -10 ~ +10 之间微调，方向用文字提示，不暴露具体偏移量。
export default function ScoreAdjuster({ estimate, adjust, onAdjustChange }) {
  const finalScore = computeFinalScore(estimate, adjust);
  const band = scoreBand(finalScore);
  const color = bandColor(finalScore);

  return (
    <div className="card">
      <div className="score-block">
        <div className="score-number" style={{ "--band": color }}>
          {finalScore}
        </div>
        <div className="score-band-label" style={{ "--band": color }}>
          {band.label}
        </div>
      </div>
      <div className="adjuster">
        <input
          className="slider"
          type="range"
          min={ADJUST_MIN}
          max={ADJUST_MAX}
          step={1}
          value={adjust}
          onChange={(e) => onAdjustChange(Number(e.target.value))}
          aria-label="微调这一刻的分数"
        />
        <div className="adjuster__hints">
          <span>再低一点</span>
          <span>刚好</span>
          <span>再高一点</span>
        </div>
      </div>
    </div>
  );
}
