import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// 只允许提交这两个数据文件，绝不 git add .
const DATA_FILES = ["data/records.json", "data/settings.json"];

function git(args) {
  return execFileAsync("git", args, {
    cwd: ROOT,
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024,
  });
}

function cleanErr(err) {
  if (!err) return null;
  const s = String(err.stderr || err.message || err).trim();
  if (!s) return null;
  return s.split(/\r?\n/).slice(0, 4).join("\n");
}

async function isGitRepo() {
  if (existsSync(path.join(ROOT, ".git"))) return true;
  try {
    const { stdout } = await git(["rev-parse", "--is-inside-work-tree"]);
    return stdout.trim() === "true";
  } catch {
    return false;
  }
}

// 没有提交身份时（全局也没配），设置一个仓库级默认，避免 commit 直接失败。
async function ensureIdentity() {
  try {
    const { stdout } = await git(["config", "user.email"]);
    if (stdout.trim()) return;
  } catch {
    /* 没配置，下面补一个 */
  }
  try {
    await git(["config", "user.email", "sy-state@localhost"]);
    await git(["config", "user.name", "Sy State"]);
  } catch {
    /* 配置失败也不阻断，交给 commit 阶段报错 */
  }
}

// diff --cached --quiet：有暂存变化时退出码为 1。
async function hasStagedChanges() {
  try {
    await git(["diff", "--cached", "--quiet"]);
    return false;
  } catch (err) {
    if (err && err.code === 1) return true;
    throw err;
  }
}

/**
 * 提交数据文件并尝试推送。
 * 返回：{ isRepo, committed, pushed, error }
 * - 文件已由 storage 写入，这里失败也不影响本地已保存的数据。
 * - 没有变化时不提交。
 * - push 失败（无远程/无网络/无权限）时 committed 仍为 true，pushed 为 false。
 */
export async function commitData(message) {
  const result = { isRepo: false, committed: false, pushed: false, error: null };
  try {
    if (!(await isGitRepo())) {
      result.error = "当前目录不是 git 仓库，已跳过提交（本地文件已保存）。";
      return result;
    }
    result.isRepo = true;
    await ensureIdentity();

    await git(["add", "--", ...DATA_FILES]);

    if (!(await hasStagedChanges())) {
      // 没有任何变化，按规则不提交。
      return result;
    }

    await git(["commit", "-m", message]);
    result.committed = true;

    try {
      await git(["push"]);
      result.pushed = true;
    } catch (pushErr) {
      result.pushed = false;
      result.error = cleanErr(pushErr) || "git push 失败。";
    }
    return result;
  } catch (err) {
    result.error = cleanErr(err) || String(err);
    return result;
  }
}
