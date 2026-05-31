// 前端唯一的网络出口。所有请求都打到本地 Node 服务（同源或经 Vite 代理）。
// 浏览器端不直接碰文件系统、不直接执行 git、不接触 API Key。

const JSON_HEADERS = { "Content-Type": "application/json" };

async function request(url, options) {
  const res = await fetch(url, options);
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* 某些响应可能没有 body */
  }
  if (!res.ok) {
    const message = (data && data.error) || `请求失败 (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  getRecords: () => request("/api/records"),

  addRecord: (payload) =>
    request("/api/records", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    }),

  deleteRecord: (id) =>
    request(`/api/records/${encodeURIComponent(id)}`, { method: "DELETE" }),

  getSettings: () => request("/api/settings"),

  addCustomFeeling: (label, baseScore) =>
    request("/api/settings/custom-feelings", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ label, baseScore }),
    }),

  deleteCustomFeeling: (label) =>
    request(`/api/settings/custom-feelings/${encodeURIComponent(label)}`, {
      method: "DELETE",
    }),

  addCustomFactor: (label) =>
    request("/api/settings/custom-factors", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ label }),
    }),

  deleteCustomFactor: (label) =>
    request(`/api/settings/custom-factors/${encodeURIComponent(label)}`, {
      method: "DELETE",
    }),

  aiStateText: (payload) =>
    request("/api/ai/state-text", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    }),

  aiFeelingScore: (label) =>
    request("/api/ai/feeling-score", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ label }),
    }),
};
