// 时间工具：记录用 UTC ISO 存储，展示与统计一律转换为本地时间。

export function pad2(n) {
  return String(n).padStart(2, "0");
}

// 本地日期 key：YYYY-MM-DD（按本地时区）
export function localDayKey(d) {
  const date = d instanceof Date ? d : new Date(d);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

// 展示用：YYYY-MM-DD HH:mm（本地）
export function toLocalDisplay(iso) {
  const d = new Date(iso);
  return `${localDayKey(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function toLocalTimeShort(iso) {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function toLocalDateDisplay(iso) {
  return localDayKey(new Date(iso));
}

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

// 周一作为一周开始
export function startOfWeek(d = new Date()) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0=周日, 1=周一 ...
  const diff = day === 0 ? 6 : day - 1; // 距离本周一的天数
  x.setDate(x.getDate() - diff);
  return x;
}

export function endOfWeek(d = new Date()) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

export function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

export function endOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

// 枚举 [start, end] 内每一天的本地 key（含端点）
export function enumerateDays(start, end) {
  const days = [];
  const cur = startOfDay(start);
  const last = startOfDay(end);
  while (cur <= last) {
    days.push(localDayKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

const WEEKDAY_CN = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

export function dayKeyToLocalDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function weekdayCn(key) {
  const d = dayKeyToLocalDate(key);
  return WEEKDAY_CN[(d.getDay() + 6) % 7];
}

export function dayOfMonth(key) {
  return Number(key.split("-")[2]);
}
