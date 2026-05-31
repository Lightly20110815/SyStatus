import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  localDayKey,
  enumerateDays,
  toLocalTimeShort,
  weekdayCn,
  dayOfMonth,
} from "./time.js";

export function filterRange(records, start, end) {
  const s = start.getTime();
  const e = end.getTime();
  return records.filter((r) => {
    const t = new Date(r.createdAt).getTime();
    return t >= s && t <= e;
  });
}

export function average(records) {
  if (!records.length) return null;
  const sum = records.reduce((a, r) => a + (Number(r.finalScore) || 0), 0);
  return Math.round(sum / records.length);
}

// 高频标签：统计出现次数，降序；相同次数保持首次出现顺序（稳定）；最多前 limit 个。
export function frequency(records, key, limit = 8) {
  const counts = new Map();
  const order = new Map();
  let idx = 0;
  for (const r of records) {
    const arr = Array.isArray(r[key]) ? r[key] : [];
    for (const label of arr) {
      if (!counts.has(label)) {
        counts.set(label, 0);
        order.set(label, idx++);
      }
      counts.set(label, counts.get(label) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || order.get(a[0]) - order.get(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

// 今天曲线：每条记录一个点，x=本地时间，y=finalScore，按时间升序。
export function todaySeries(records) {
  return [...records]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map((r) => ({ label: toLocalTimeShort(r.createdAt), score: r.finalScore, id: r.id }));
}

// 按天平均：覆盖 [start,end] 每一天；无记录的天 score=null（不强行补 0，曲线显示为断口）。
export function dailyAverageSeries(records, start, end, labelFn) {
  const byDay = new Map();
  for (const r of records) {
    const k = localDayKey(new Date(r.createdAt));
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k).push(Number(r.finalScore) || 0);
  }
  return enumerateDays(start, end).map((k) => {
    const arr = byDay.get(k);
    const score = arr && arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
    return { key: k, label: labelFn ? labelFn(k) : k, score };
  });
}

// range: 'today' | 'week' | 'month'
// 返回该范围的统计汇总。范围末端不超过今天（不展示未来空白天）。
export function computeStats(allRecords, range) {
  const now = new Date();
  const todayEnd = endOfDay(now);

  let start;
  let end;
  let labelFn = null;
  let seriesType = "day";

  if (range === "today") {
    start = startOfDay(now);
    end = todayEnd;
    seriesType = "time";
  } else if (range === "week") {
    start = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    end = weekEnd < todayEnd ? weekEnd : todayEnd;
    labelFn = weekdayCn;
  } else {
    start = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    end = monthEnd < todayEnd ? monthEnd : todayEnd;
    labelFn = dayOfMonth;
  }

  const recs = filterRange(allRecords, start, end);
  const series =
    seriesType === "time" ? todaySeries(recs) : dailyAverageSeries(recs, start, end, labelFn);

  return {
    range,
    count: recs.length,
    average: average(recs),
    series,
    seriesType,
    topFeelings: frequency(recs, "feelings"),
    topFactors: frequency(recs, "factors"),
  };
}
