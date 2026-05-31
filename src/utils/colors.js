import { scoreBand } from "./score.js";

// 区间配色（仅前端使用）。冷 → 暖、低饱和：
// 低分用雾蓝/灰蓝，避免刺眼纯红；高分用柔和沙金，不做成游戏奖励金。
export const BAND_COLORS = {
  standby: "#8392a6", // 停机保护
  deeplow: "#7d93a3", // 深度低电量
  barely: "#7f9a9d", // 勉强维持
  holding: "#84a08f", // 不太好，但还在
  stable: "#8caa80", // 基本稳定
  spare: "#a6b277", // 有余力
  warm: "#c79a6b", // 温暖外溢
};

export function bandColor(score) {
  return BAND_COLORS[scoreBand(score).key] || BAND_COLORS.holding;
}
