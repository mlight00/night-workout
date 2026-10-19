// 체중·심박·레벨 기록을 그래프용 숫자로. 순수 함수.

import { addDays } from './schedule.js';

// 그 날짜가 속한 주의 월요일
export function weekStart(day) {
  const [y, m, d] = day.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay(); // 0=일
  return addDays(day, dow === 0 ? -6 : 1 - dow);
}

// 이번 주(월~일)에 체중을 아직 안 넣었으면 true
export function needsWeight(weights, today) {
  const ws = weekStart(today);
  return !weights.some((w) => w.date >= ws && w.date <= today);
}

export function addWeight(weights, date, kg) {
  return [...weights.filter((w) => w.date !== date), { date, kg: Math.round(kg * 10) / 10 }].sort((a, b) => a.date.localeCompare(b.date));
}

// 주별 마지막 체중 + 최근 4주 평균
export function weightSeries(weights) {
  const byWeek = new Map();
  for (const w of [...weights].sort((a, b) => a.date.localeCompare(b.date))) byWeek.set(weekStart(w.date), w.kg);
  const pts = [...byWeek].map(([week, kg]) => ({ x: week, y: kg }));
  return pts.map((p, i) => {
    const win = pts.slice(Math.max(0, i - 3), i + 1);
    return { ...p, avg: Math.round((win.reduce((s, q) => s + q.y, 0) / win.length) * 10) / 10 };
  });
}

export function bikeSeries(sessions) {
  return sessions
    .filter((s) => s.type === 'bike' && s.bike && s.bike.avgHr)
    .map((s) => ({ x: s.date, y: s.bike.avgHr, res: s.bike.resistance, lv: s.bike.lv }));
}

export function levelSeries(sessions, id) {
  return sessions
    .filter((s) => s.results && s.results[id])
    .map((s) => ({ x: s.date, y: s.results[id].lv }));
}

// 자전거 탄 시간(분): 새 기록은 실제로 탄 시간, 예전 기록은 전체 시간
const rideMin = (s) => (s.bike && s.bike.rideMin != null ? s.bike.rideMin : Math.round((s.totalSeconds || 0) / 60));

// 이번 주(월~오늘) 유산소: 자전거 + 걷기
export function aerobicWeek(sessions, walks, today) {
  const ws = weekStart(today), inWeek = (d) => d >= ws && d <= today;
  const bike = sessions.filter((s) => s.type === 'bike' && inWeek(s.date)).reduce((t, s) => t + rideMin(s), 0);
  const walk = (walks || []).filter((w) => inWeek(w.date)).reduce((t, w) => t + w.min, 0);
  return { bike, walk, total: bike + walk };
}

export function addWalk(walks, date, min) {
  return [...(walks || []), { date, min }];
}

// 오늘 마지막 걷기 기록 지우기 (잘못 눌렀을 때)
export function undoWalk(walks, date) {
  const i = (walks || []).map((w) => w.date).lastIndexOf(date);
  return i < 0 ? walks : walks.filter((_, j) => j !== i);
}

// 주별 유산소 합계 (그래프용)
export function aerobicSeries(sessions, walks) {
  const byWeek = new Map();
  const add = (d, m) => { const w = weekStart(d); byWeek.set(w, (byWeek.get(w) || 0) + m); };
  for (const s of sessions) if (s.type === 'bike') add(s.date, rideMin(s));
  for (const w of walks || []) add(w.date, w.min);
  return [...byWeek].sort((a, b) => a[0].localeCompare(b[0])).map(([x, y]) => ({ x, y }));
}
