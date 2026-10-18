// 일주일 흐름 — 월~금은 근력과 자전거를 번갈아, 토·일은 해도 되고 쉬어도 된다. 6일 연속이면 휴식 권유.
// 쉬기로 한 날은 { type: 'rest' } 기록으로 남긴다 (운동 차례·연속 일수에는 안 들어간다).
// 날짜는 현지 'YYYY-MM-DD' 문자열. 순수 함수.

import { BIKE_ROTATION } from './program.js';

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
  return sessions.some((s) => s.date === today && s.type !== 'rest');
}

// 오늘 "쉬기"를 눌렀는가
export function passedToday(sessions, today) {
  return sessions.some((s) => s.date === today && s.type === 'rest');
}

export function isWeekend(day) {
  const [y, m, d] = day.split('-').map(Number);
  const w = new Date(y, m - 1, d).getDay();
  return w === 0 || w === 6;
}

// 자전거 루틴 차례: 마지막 자전거 날 루틴의 다음 (처음이거나 꾸준히·가볍게였으면 그 전 것 기준)
export function nextRoutine(sessions) {
  const last = sessions.filter((s) => s.type === 'bike' && s.bike && BIKE_ROTATION.includes(s.bike.routine)).at(-1);
  if (!last) return BIKE_ROTATION[0];
  return BIKE_ROTATION[(BIKE_ROTATION.indexOf(last.bike.routine) + 1) % BIKE_ROTATION.length];
}

// 어제까지 며칠 연속으로 운동했는가
export function streakDays(sessions, today) {
  const days = new Set(sessions.filter((s) => s.type !== 'rest').map((s) => s.date));
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
    return { date, type: s ? s.type : null, light: !!(s && s.mode === 'light'), weekend: isWeekend(date) };
  });
}
