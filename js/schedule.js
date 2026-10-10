// 일주일 흐름 — 근력과 자전거를 번갈아, 6일 연속이면 휴식 권유.
// 날짜는 현지 'YYYY-MM-DD' 문자열. 순수 함수.

export function ymd(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(day, n) {
  const [y, m, d] = day.split('-').map(Number);
  return ymd(new Date(y, m - 1, d + n));
}

const workouts = (sessions) => sessions.filter((s) => s.type === 'strength' || s.type === 'bike');

// 다음 차례: 마지막 운동의 반대. 처음이면 근력.
export function nextType(sessions) {
  const last = workouts(sessions).at(-1);
  return last && last.type === 'strength' ? 'bike' : 'strength';
}

export function doneToday(sessions, today) {
  return sessions.some((s) => s.date === today);
}

// 어제까지 며칠 연속으로 운동했는가
export function streakDays(sessions, today) {
  const days = new Set(sessions.map((s) => s.date));
  let n = 0;
  for (let d = addDays(today, -1); days.has(d); d = addDays(d, -1)) n++;
  return n;
}

export function restSuggested(sessions, today) {
  return !doneToday(sessions, today) && streakDays(sessions, today) >= 6;
}

// 최근 7일 (오늘 포함) — 달력 줄
export function weekStrip(sessions, today) {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    const s = sessions.filter((x) => x.date === date).at(-1);
    return { date, type: s ? s.type : null, light: !!(s && s.mode === 'light') };
  });
}
