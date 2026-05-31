import { scoreBand } from "../src/utils/score.js";
import { DEFAULT_FEELINGS } from "../src/data/defaultFeelings.js";

// AI 调用统一走本地服务（参考 curve-react 的 DeepSeek 代理方式），
// 浏览器端永远拿不到 API Key。任何失败都回落到本地 fallback，功能不会坏。

const API_URL = "https://api.deepseek.com/chat/completions";
const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const TIMEOUT_MS = 15000;

const FEELING_REFERENCE = DEFAULT_FEELINGS.map((f) => `${f.label}=${f.baseScore}`).join("，");

const STATE_SYSTEM_PROMPT = `你是 Sy 的本地状态记录器，只负责把某一瞬间的心理状态写成一句安静的话。

【人称与口吻】
- 一律第三人称，主语主要是「Sy」。
- 绝对不能出现这些字词：我、你、您、用户、来访者、当前个体、患者。
- 这不是诊断报告，不是心理咨询，不是聊天回复。

【语气】
- 安静、克制、低刺激。
- 分数越低越要温柔，可以用「低电量」「停机保护」这类说法，绝不刺痛 Sy。
- 不要鸡汤、不要成功学、不要打卡感。
- 禁止出现「要相信自己」「今天也要努力」「一切都会好起来」这类话。

【内容】
- 可以给具体或抽象的建议，但不强迫。
- 长度不限：可以一句，也可以两三句，但不要写成长篇分析。

【输出】
- 只输出这一句状态描述本身。
- 不要引号、不要前缀、不要解释、不要 JSON、不要 markdown。`;

const SCORE_SYSTEM_PROMPT = `你要为一个心理状态记录工具的「感受标签」分配一个 0–100 的整数 baseScore。
含义：baseScore 越低代表整体心理状态越差，越高越好。

请严格参考已有的默认感受体系（label=baseScore）：
${FEELING_REFERENCE}

接下来会给你一个新的感受标签。请判断它代表的心理状态偏好还是偏坏，
给出一个 0–100 的整数 baseScore，与上面的体系保持同一把尺子。
只输出一个 JSON：{"baseScore": <整数>}
不要输出任何其它内容。`;

async function callDeepSeek({ messages, temperature = 0.7, maxTokens = 300 }) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("missing DEEPSEEK_API_KEY");

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: false,
      temperature,
      max_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`deepseek ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("deepseek empty content");
  return content;
}

// ---- 状态句子 ----

function stateUserPrompt({ finalScore, feelings, factors, band }) {
  const fl = feelings.length ? feelings.join("、") : "（未选）";
  const fa = factors.length ? factors.join("、") : "（未选）";
  return [
    `分数：${finalScore}（区间：${band.label}，越低状态越差）`,
    `感受：${fl}`,
    `影响因素：${fa}`,
    `请据此写一句关于 Sy 此刻状态的话。`,
  ].join("\n");
}

function sanitizeStateText(text) {
  if (!text) return "";
  let t = String(text).trim();
  t = t.replace(/^```[a-z]*\s*/i, "").replace(/```$/, "").trim();
  t = t.replace(/^["'「『“”]+/, "").replace(/["'」』“”]+$/, "").trim();
  return t;
}

// 强约束人称规则：出现禁用字词一律视为不合格，回落到 fallback。
function violatesPersonRules(text) {
  return /[你您我]|用户|来访者|当前个体|患者/.test(text);
}

const FALLBACK_TAIL = {
  standby: "已经进入停机保护，先把这一刻存下来，别再增加任何任务。",
  deeplow: "处在深度低电量，能把它记录下来，就已经足够。",
  barely: "在勉强维持，先把状态留下，其它的事可以慢一点。",
  holding: "算不上好，但还在，保存这一刻就够了。",
  stable: "基本稳定，存下这一刻，按自己的节奏继续。",
  spare: "还留着一点余力，先把状态记好，不必急着做更多。",
  warm: "状态是温暖的，给这份感觉留个记号。",
};

// 本地 fallback：根据分数区间 + 首个感受，生成一句第三人称状态句子。
export function localStateText({ finalScore, feelings = [], factors = [] }) {
  const band = scoreBand(finalScore);
  const first = feelings && feelings.length ? feelings[0] : null;
  const lead = first ? `这一刻的 Sy 有些${first}` : `这一刻的 Sy`;
  const tail = FALLBACK_TAIL[band.key] || FALLBACK_TAIL.holding;
  return `${lead}，${tail}`;
}

export async function generateStateText({ finalScore, feelings = [], factors = [] }) {
  const band = scoreBand(finalScore);
  const fallback = localStateText({ finalScore, feelings, factors });
  try {
    const raw = await callDeepSeek({
      messages: [
        { role: "system", content: STATE_SYSTEM_PROMPT },
        { role: "user", content: stateUserPrompt({ finalScore, feelings, factors, band }) },
      ],
      temperature: 0.85,
      maxTokens: 220,
    });
    const cleaned = sanitizeStateText(raw);
    if (!cleaned || violatesPersonRules(cleaned)) {
      return { text: fallback, source: "fallback" };
    }
    return { text: cleaned, source: "ai" };
  } catch {
    return { text: fallback, source: "fallback" };
  }
}

// ---- 自定义感受权重 ----

function clamp0to100(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function parseScore(text) {
  if (!text) return null;
  const stripped = String(text).replace(/```json|```/gi, "").trim();
  try {
    const obj = JSON.parse(stripped);
    if (obj && Number.isFinite(Number(obj.baseScore))) {
      return clamp0to100(Number(obj.baseScore));
    }
  } catch {
    /* 不是纯 JSON，下面用正则兜底 */
  }
  const m = stripped.match(/-?\d+(\.\d+)?/);
  if (m) {
    const n = Number(m[0]);
    if (Number.isFinite(n)) return clamp0to100(n);
  }
  return null;
}

// AI 失败时回落到 50，并标记 fallback（前端显示"待校准"）。
export async function assignFeelingScore({ label }) {
  try {
    const raw = await callDeepSeek({
      messages: [
        { role: "system", content: SCORE_SYSTEM_PROMPT },
        { role: "user", content: `新的感受标签：「${label}」。请给出它的 baseScore。` },
      ],
      temperature: 0,
      maxTokens: 60,
    });
    const score = parseScore(raw);
    if (score === null) return { baseScore: 50, source: "fallback" };
    return { baseScore: score, source: "ai" };
  } catch {
    return { baseScore: 50, source: "fallback" };
  }
}
