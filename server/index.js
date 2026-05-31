import http from "node:http";
import { promises as fs, existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { loadEnv } from "./env.js";
import {
  ensureDataFiles,
  readRecords,
  addRecord,
  deleteRecord,
  readSettings,
  addCustomFeeling,
  removeCustomFeeling,
  addCustomFactor,
  removeCustomFactor,
} from "./storage.js";
import { commitData } from "./git.js";
import { generateStateText, assignFeelingScore, localStateText } from "./ai.js";
import { clampScore } from "../src/utils/score.js";

loadEnv();
ensureDataFiles();

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT) || 4823;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
};

const NOT_BUILT_HTML = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<title>Sy State</title><style>body{font-family:system-ui,sans-serif;background:#f4f4f3;color:#2b2b2b;
display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
.box{max-width:32rem;padding:2rem;line-height:1.8}code{background:#eceae6;padding:.1em .4em;border-radius:4px}
</style></head><body><div class="box"><h1>Sy State 还没有构建</h1>
<p>前端尚未构建（缺少 <code>dist/</code>）。请在项目目录运行：</p>
<p><code>npm install</code> 然后 <code>npm run build</code></p>
<p>或直接用 <code>scripts/start-local.ps1</code> 启动，它会自动安装并构建。</p></div></body></html>`;

// ---- 工具 ----

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(body);
}

function setCors(res) {
  // 仅监听本机回环地址，本地工具范围内放开 CORS 是安全的。
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1_000_000) {
        reject(new Error("请求体过大"));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error("请求体不是合法 JSON"));
      }
    });
    req.on("error", reject);
  });
}

function localDayStr(iso) {
  try {
    return new Date(iso).toLocaleDateString("sv-SE"); // YYYY-MM-DD（本地时区）
  } catch {
    return "";
  }
}

function asLabel(v) {
  return typeof v === "string" ? v.trim() : "";
}

function asLabelArray(v, max) {
  if (!Array.isArray(v)) return [];
  const out = [];
  const seen = new Set();
  for (const item of v) {
    const s = asLabel(item);
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

// ---- API 路由 ----

async function handleApi(req, res, pathname, method) {
  // 记录
  if (pathname === "/api/records" && method === "GET") {
    const data = await readRecords();
    return sendJson(res, 200, data);
  }

  if (pathname === "/api/records" && method === "POST") {
    const body = await readBody(req);

    const feelings = asLabelArray(body?.feelings, 6);
    const factors = asLabelArray(body?.factors, 10);
    if (feelings.length < 1) {
      return sendJson(res, 400, { error: "至少选择 1 个感受标签" });
    }
    const finalScore = clampScore(Number(body?.finalScore));
    let stateText = typeof body?.stateText === "string" ? body.stateText.trim() : "";
    // 保证每条记录都有状态句子：为空时用本地 fallback 补上。
    if (!stateText) {
      stateText = localStateText({ finalScore, feelings, factors });
    }

    const record = await addRecord({ finalScore, feelings, factors, stateText });
    const git = await commitData(`chore(data): add state record ${localDayStr(record.createdAt)}`);
    return sendJson(res, 200, {
      record,
      saved: true,
      committed: git.committed,
      pushed: git.pushed,
      pushError: git.error,
    });
  }

  if (pathname.startsWith("/api/records/") && method === "DELETE") {
    const id = decodeURIComponent(pathname.slice("/api/records/".length));
    const { deleted, record } = await deleteRecord(id);
    if (!deleted) return sendJson(res, 404, { error: "记录不存在" });
    const git = await commitData(`chore(data): delete state record ${localDayStr(record.createdAt)}`);
    return sendJson(res, 200, {
      deleted: true,
      saved: true,
      committed: git.committed,
      pushed: git.pushed,
      pushError: git.error,
    });
  }

  // 设置
  if (pathname === "/api/settings" && method === "GET") {
    const settings = await readSettings();
    return sendJson(res, 200, settings);
  }

  if (pathname === "/api/settings/custom-feelings" && method === "POST") {
    const body = await readBody(req);
    const label = asLabel(body?.label);
    if (!label) return sendJson(res, 400, { error: "请输入感受名称" });
    if (body?.baseScore === undefined || body?.baseScore === null || body?.baseScore === "") {
      return sendJson(res, 400, { error: "请填写权重" });
    }
    if (!Number.isFinite(Number(body.baseScore))) {
      return sendJson(res, 400, { error: "权重不合法" });
    }
    const baseScore = clampScore(Number(body.baseScore));
    const result = await addCustomFeeling({ label, baseScore });
    if (!result.ok) {
      return sendJson(res, 409, { error: "这个感受已经存在" });
    }
    const git = await commitData("chore(data): update state settings");
    return sendJson(res, 200, {
      item: result.item,
      settings: result.settings,
      saved: true,
      committed: git.committed,
      pushed: git.pushed,
      pushError: git.error,
    });
  }

  if (pathname.startsWith("/api/settings/custom-feelings/") && method === "DELETE") {
    const label = decodeURIComponent(pathname.slice("/api/settings/custom-feelings/".length));
    const result = await removeCustomFeeling(label);
    if (!result.removed) return sendJson(res, 404, { error: "未找到该自定义感受" });
    const git = await commitData("chore(data): update state settings");
    return sendJson(res, 200, {
      settings: result.settings,
      saved: true,
      committed: git.committed,
      pushed: git.pushed,
      pushError: git.error,
    });
  }

  if (pathname === "/api/settings/custom-factors" && method === "POST") {
    const body = await readBody(req);
    const label = asLabel(body?.label);
    if (!label) return sendJson(res, 400, { error: "请输入影响因素名称" });
    const result = await addCustomFactor({ label });
    if (!result.ok) {
      return sendJson(res, 409, { error: "这个影响因素已经存在" });
    }
    const git = await commitData("chore(data): update state settings");
    return sendJson(res, 200, {
      item: result.item,
      settings: result.settings,
      saved: true,
      committed: git.committed,
      pushed: git.pushed,
      pushError: git.error,
    });
  }

  if (pathname.startsWith("/api/settings/custom-factors/") && method === "DELETE") {
    const label = decodeURIComponent(pathname.slice("/api/settings/custom-factors/".length));
    const result = await removeCustomFactor(label);
    if (!result.removed) return sendJson(res, 404, { error: "未找到该自定义影响因素" });
    const git = await commitData("chore(data): update state settings");
    return sendJson(res, 200, {
      settings: result.settings,
      saved: true,
      committed: git.committed,
      pushed: git.pushed,
      pushError: git.error,
    });
  }

  // AI（始终返回可用结果：失败则带 source: "fallback"）
  if (pathname === "/api/ai/state-text" && method === "POST") {
    const body = await readBody(req);
    const finalScore = clampScore(Number(body?.finalScore));
    const feelings = asLabelArray(body?.feelings, 6);
    const factors = asLabelArray(body?.factors, 10);
    const out = await generateStateText({ finalScore, feelings, factors });
    return sendJson(res, 200, out);
  }

  if (pathname === "/api/ai/feeling-score" && method === "POST") {
    const body = await readBody(req);
    const label = asLabel(body?.label);
    if (!label) return sendJson(res, 400, { error: "请输入感受名称" });
    const out = await assignFeelingScore({ label });
    return sendJson(res, 200, out);
  }

  return sendJson(res, 404, { error: "未知接口" });
}

// ---- 静态文件托管（生产 / 桌面快捷方式模式）----

async function serveStatic(res, pathname) {
  if (!existsSync(DIST)) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(NOT_BUILT_HTML);
    return;
  }

  let rel = decodeURIComponent(pathname);
  if (rel === "/" || rel === "") rel = "/index.html";

  const filePath = path.join(DIST, rel);
  // 防目录穿越：解析后必须仍在 dist 内。
  if (filePath !== DIST && !filePath.startsWith(DIST + path.sep)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  } catch {
    // SPA 回退：未知路由一律返回 index.html，交给前端路由处理。
    try {
      const html = await fs.readFile(path.join(DIST, "index.html"));
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  }
}

// ---- 服务器 ----

const server = http.createServer(async (req, res) => {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  let pathname = "/";
  try {
    pathname = new URL(req.url, `http://${HOST}:${PORT}`).pathname;
  } catch {
    pathname = req.url || "/";
  }

  try {
    if (pathname.startsWith("/api/")) {
      await handleApi(req, res, pathname, req.method);
    } else {
      await serveStatic(res, pathname);
    }
  } catch (err) {
    if (!res.headersSent) {
      sendJson(res, 500, { error: "服务端错误", detail: String((err && err.message) || err) });
    } else {
      res.end();
    }
  }
});

function openBrowser(url) {
  const platform = process.platform;
  let cmd;
  let args;
  if (platform === "win32") {
    cmd = "cmd";
    args = ["/c", "start", "", url];
  } else if (platform === "darwin") {
    cmd = "open";
    args = [url];
  } else {
    cmd = "xdg-open";
    args = [url];
  }
  try {
    const cp = spawn(cmd, args, { detached: true, stdio: "ignore" });
    cp.unref();
  } catch {
    /* 打不开浏览器不影响服务运行 */
  }
}

server.listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}`;
  console.log(`\n  Sy State 本地服务已启动`);
  console.log(`  ${url}`);
  console.log(`  数据目录：${path.join(ROOT, "data")}`);
  if (!process.env.DEEPSEEK_API_KEY) {
    console.log(`  提示：未检测到 DEEPSEEK_API_KEY，AI 将使用本地 fallback（功能正常）。`);
  }
  console.log(`  按 Ctrl+C 退出。\n`);
  if (process.env.SY_OPEN === "1") openBrowser(url);
});

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(`\n  端口 ${PORT} 已被占用。可能服务已在运行，或设置环境变量 PORT 换一个端口。\n`);
  } else {
    console.error("服务启动失败：", err);
  }
  process.exit(1);
});
