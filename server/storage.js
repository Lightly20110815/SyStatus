import { promises as fs, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_FEELINGS } from "../src/data/defaultFeelings.js";
import { DEFAULT_FACTORS } from "../src/data/defaultFactors.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DATA_DIR = path.join(ROOT, "data");
export const RECORDS_PATH = path.join(DATA_DIR, "records.json");
export const SETTINGS_PATH = path.join(DATA_DIR, "settings.json");

const EMPTY_RECORDS = { version: 1, records: [] };
const EMPTY_SETTINGS = { version: 1, customFeelings: [], customFactors: [] };

const DEFAULT_FEELING_LABELS = new Set(DEFAULT_FEELINGS.map((f) => f.label));
const DEFAULT_FACTOR_LABELS = new Set(DEFAULT_FACTORS);

// 启动时确保数据目录与文件存在；缺失则按初始结构创建。
export function ensureDataFiles() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(RECORDS_PATH)) {
    writeFileSync(RECORDS_PATH, JSON.stringify(EMPTY_RECORDS, null, 2) + "\n", "utf8");
  }
  if (!existsSync(SETTINGS_PATH)) {
    writeFileSync(SETTINGS_PATH, JSON.stringify(EMPTY_SETTINGS, null, 2) + "\n", "utf8");
  }
}

// 原子写：先写临时文件再 rename，避免写入过程中崩溃损坏数据。
async function writeJsonAtomic(filePath, obj) {
  const text = JSON.stringify(obj, null, 2) + "\n";
  const tmp = filePath + ".tmp";
  await fs.writeFile(tmp, text, "utf8");
  try {
    await fs.rename(tmp, filePath);
  } catch {
    // rename 失败（极少见，如被占用）时退回直接覆盖写。
    await fs.writeFile(filePath, text, "utf8");
    try {
      await fs.unlink(tmp);
    } catch {
      /* 忽略临时文件清理失败 */
    }
  }
}

async function readJson(filePath, fallback) {
  if (!existsSync(filePath)) {
    await writeJsonAtomic(filePath, fallback);
    return structuredClone(fallback);
  }
  const raw = await fs.readFile(filePath, "utf8");
  if (!raw.trim()) {
    // 空文件：当作初始结构，并写回。
    await writeJsonAtomic(filePath, fallback);
    return structuredClone(fallback);
  }
  // 解析失败时抛出，绝不用空结构覆盖已有数据（保护数据正确性）。
  return JSON.parse(raw);
}

export async function readRecords() {
  const data = await readJson(RECORDS_PATH, EMPTY_RECORDS);
  if (!data || typeof data !== "object" || !Array.isArray(data.records)) {
    throw new Error("records.json 结构异常：缺少 records 数组");
  }
  if (typeof data.version !== "number") data.version = 1;
  return data;
}

export async function writeRecords(data) {
  await writeJsonAtomic(RECORDS_PATH, data);
}

export async function readSettings() {
  const data = await readJson(SETTINGS_PATH, EMPTY_SETTINGS);
  if (!data || typeof data !== "object") {
    throw new Error("settings.json 结构异常");
  }
  if (!Array.isArray(data.customFeelings)) data.customFeelings = [];
  if (!Array.isArray(data.customFactors)) data.customFactors = [];
  if (typeof data.version !== "number") data.version = 1;
  return data;
}

export async function writeSettings(data) {
  await writeJsonAtomic(SETTINGS_PATH, data);
}

// ---- 记录 ----

export async function addRecord({ finalScore, feelings, factors, stateText }) {
  const data = await readRecords();

  let createdAt = new Date().toISOString();
  const existingIds = new Set(data.records.map((r) => r.id));
  // 极端情况下（同一毫秒重复保存）保证 id 唯一，同时保持 id === createdAt。
  while (existingIds.has(createdAt)) {
    createdAt = new Date(new Date(createdAt).getTime() + 1).toISOString();
  }

  const record = {
    id: createdAt,
    createdAt,
    finalScore,
    feelings,
    factors,
    stateText,
  };

  data.records.push(record);
  // 按创建时间升序保存：最早在前，最新在后。
  data.records.sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
  );

  await writeRecords(data);
  return record;
}

export async function deleteRecord(id) {
  const data = await readRecords();
  const idx = data.records.findIndex((r) => r.id === id);
  if (idx === -1) return { deleted: false, record: null };
  const [record] = data.records.splice(idx, 1);
  await writeRecords(data);
  return { deleted: true, record };
}

// ---- 自定义感受 ----

function feelingLabelExists(label, settings) {
  if (DEFAULT_FEELING_LABELS.has(label)) return true;
  return settings.customFeelings.some((f) => f.label === label);
}

export async function addCustomFeeling({ label, baseScore }) {
  const settings = await readSettings();
  if (feelingLabelExists(label, settings)) {
    return { ok: false, reason: "duplicate" };
  }
  const item = { label, baseScore, createdAt: new Date().toISOString() };
  settings.customFeelings.push(item);
  await writeSettings(settings);
  return { ok: true, item, settings };
}

export async function removeCustomFeeling(label) {
  const settings = await readSettings();
  const before = settings.customFeelings.length;
  settings.customFeelings = settings.customFeelings.filter((f) => f.label !== label);
  if (settings.customFeelings.length === before) {
    return { removed: false, settings };
  }
  await writeSettings(settings);
  return { removed: true, settings };
}

// ---- 自定义影响因素 ----

function factorLabelExists(label, settings) {
  if (DEFAULT_FACTOR_LABELS.has(label)) return true;
  return settings.customFactors.includes(label);
}

export async function addCustomFactor({ label }) {
  const settings = await readSettings();
  if (factorLabelExists(label, settings)) {
    return { ok: false, reason: "duplicate" };
  }
  settings.customFactors.push(label);
  await writeSettings(settings);
  return { ok: true, item: label, settings };
}

export async function removeCustomFactor(label) {
  const settings = await readSettings();
  const before = settings.customFactors.length;
  settings.customFactors = settings.customFactors.filter((f) => f !== label);
  if (settings.customFactors.length === before) {
    return { removed: false, settings };
  }
  await writeSettings(settings);
  return { removed: true, settings };
}
