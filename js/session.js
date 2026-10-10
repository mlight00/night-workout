// 운동 한 번의 결과 정리 — 타이머의 stepEnd 이벤트를 하루치 기록으로. 순수 함수.

import { ymd } from './schedule.js';

const HOLD_SLACK = 0.5; // 버티기는 목표보다 0.5초 이상 일찍 끝내면 미달

export function strengthResults(ends) {
  const out = {};
  for (const e of ends) {
    const s = e.step;
    if (s.kind !== 'work') continue;
    const r = (out[s.exId] ??= { lv: s.lv, name: s.name, group: s.group, type: s.type, target: s.target, totalSets: s.totalSets, sets: [], held: [] });
    r.sets.push(Math.round(e.actualSeconds));
    r.held.push(s.type === 'hold' ? e.actualSeconds >= s.target - HOLD_SLACK : null);
  }
  for (const r of Object.values(out)) {
    r.setsDone = r.sets.length;
    r.allHeld = r.type === 'hold' ? r.held.every(Boolean) : null;
    delete r.held;
  }
  return out;
}

// checks: { reps: 모든 세트 목표 횟수(횟수 종목), form: 바른 자세로 끝까지 }
export function judge(r, checks) {
  if (r.setsDone < r.totalSets || !checks.form) return false;
  return r.type === 'hold' ? r.allHeld : !!checks.reps;
}

// 자전거: 메인(목표·언덕) 구간을 하나도 건너뛰지 않고 끝까지 탔는가
export function bikeMainDone(ends, steps) {
  const main = steps.filter((s) => s.kind === 'ride' && (s.zone === 'target' || s.zone === 'hill'));
  const done = ends.filter((e) => main.includes(e.step) && e.reason === 'timeout');
  return main.length > 0 && done.length === main.length;
}

export function makeRecord({ type, mode, condition, startedAt, endedAt, completed, quitReason, ends, steps, bikeLv }) {
  const start = new Date(startedAt);
  const rec = {
    date: ymd(start), type, mode, condition, startedAt, endedAt,
    totalSeconds: Math.round((new Date(endedAt) - start) / 1000),
    completed, quitReason: quitReason || null, judged: false,
  };
  if (type === 'strength') rec.results = strengthResults(ends);
  if (type === 'bike') rec.bike = { lv: bikeLv, mainDone: bikeMainDone(ends, steps), avgHr: null, resistance: null };
  return rec;
}
