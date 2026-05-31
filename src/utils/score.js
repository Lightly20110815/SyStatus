import { DEFAULT_FEELINGS } from "../data/defaultFeelings.js";

// 分数与区间逻辑。前端（估算/微调/配色）与本地 Node 服务（兜底文案、校验）共用，
// 是分数系统的唯一来源。

export const SCORE_MIN = 0;
export const SCORE_MAX = 100;
export const ADJUST_MIN = -10;
export const ADJUST_MAX = 10;

export function clampScore(n) {
  if (!Number.isFinite(Number(n))) return 0;
  return Math.max(SCORE_MIN, Math.min(SCORE_MAX, Math.round(Number(n))));
}

export function clampAdjust(n) {
  if (!Number.isFinite(Number(n))) return 0;
  return Math.max(ADJUST_MIN, Math.min(ADJUST_MAX, Math.round(Number(n))));
}

// 区间为闭区间。key 用于配色，label 用于文案与 fallback。
export const SCORE_BANDS = [
  { key: "standby", min: 0, max: 10, label: "停机保护" },
  { key: "deeplow", min: 11, max: 25, label: "深度低电量" },
  { key: "barely", min: 26, max: 40, label: "勉强维持" },
  { key: "holding", min: 41, max: 55, label: "不太好，但还在" },
  { key: "stable", min: 56, max: 70, label: "基本稳定" },
  { key: "spare", min: 71, max: 85, label: "有余力" },
  { key: "warm", min: 86, max: 100, label: "温暖外溢" },
];

export function scoreBand(score) {
  const s = clampScore(score);
  return SCORE_BANDS.find((b) => s >= b.min && s <= b.max) || SCORE_BANDS[0];
}

// 估算分 = 所选感受 baseScore 的平均值，四舍五入为整数。
// feelingScoreMap: { [label]: baseScore }
export function estimateScore(selectedLabels, feelingScoreMap) {
  const scores = (selectedLabels || [])
    .map((label) => feelingScoreMap[label])
    .filter((v) => Number.isFinite(v));
  if (scores.length === 0) return 0;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(avg);
}

// 最终分 = clamp(估算分 + 微调值)
export function computeFinalScore(estimate, adjust) {
  return clampScore(clampScore(estimate) + clampAdjust(adjust));
}

// 合并默认与自定义感受，得到 label -> baseScore 映射。
// 自定义标签不允许与默认重名，因此直接合并即可。
export function buildFeelingScoreMap(customFeelings = []) {
  const map = {};
  for (const f of DEFAULT_FEELINGS) map[f.label] = f.baseScore;
  for (const f of customFeelings || []) {
    if (f && typeof f.label === "string" && Number.isFinite(Number(f.baseScore))) {
      map[f.label] = Number(f.baseScore);
    }
  }
  return map;
}
