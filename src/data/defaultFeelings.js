// 默认感受标签与内部权重（baseScore）。
//
// baseScore 含义：0–100，越低代表整体心理状态越差，越高越好。
// 它只用于"根据所选感受估算分数"，绝不在普通 UI 里展示。
//
// 这个文件同时被前端（Vite）和本地 Node 服务（校验重复、AI 参考体系）引用，
// 是默认感受体系的唯一来源，改这里即可，不要在别处复制一份。

export const DEFAULT_FEELINGS = [
  { label: "麻木", baseScore: 18 },
  { label: "焦虑", baseScore: 32 },
  { label: "疲惫", baseScore: 36 },
  { label: "害怕", baseScore: 24 },
  { label: "压迫", baseScore: 27 },
  { label: "烦躁", baseScore: 44 },
  { label: "混乱", baseScore: 38 },
  { label: "空掉", baseScore: 16 },
  { label: "想逃", baseScore: 22 },
  { label: "崩溃边缘", baseScore: 8 },
  { label: "低电量", baseScore: 34 },
  { label: "卡住", baseScore: 40 },
  { label: "委屈", baseScore: 35 },
  { label: "孤独", baseScore: 28 },
  { label: "不安", baseScore: 37 },
  { label: "被丢下", baseScore: 20 },
  { label: "被理解", baseScore: 72 },
  { label: "平静", baseScore: 74 },
  { label: "柔软", baseScore: 76 },
  { label: "安心", baseScore: 80 },
  { label: "轻一点了", baseScore: 64 },
  { label: "能行动", baseScore: 66 },
  { label: "有余力", baseScore: 78 },
  { label: "温暖", baseScore: 88 },
];
