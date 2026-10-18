// 운동 한 번의 결과 정리 — 타이머의 stepEnd 이벤트를 하루치 기록으로. 순수 함수.

import { ymd } from './schedule.js';

const HOLD_SLACK = 0.5; // 버티기는 목표보다 0.5초 이상 일찍 끝내면 미달

export function strengthResults(ends) {
  const out = {};
  for (const e of ends) {
    const s = e.step;
    if (s.kind !== 'work') continue;
    const r = (out[s.exId] ??= { lv: s.lv, name: s.name, group: s.group, type: s.type, target: s.target, totalSets: s.totalSets, sets: [], targets: [], held: [] });
    r.sets.push(Math.round(e.actualSeconds));
    r.targets.push(s.target);
    r.held.push(s.type === 'hold' ? e.actualSeconds >= s.target - HOLD_SLACK : null);
  }
  for (const r of Object.values(out)) {
    r.setsDone = r.sets.length;
    r.allHeld = r.type === 'hold' ? r.held.every(Boolean) : null;
    delete r.held;
  }
  return out;
}

// ---- 운동 평가 --------------------------------------------------------------
// 등급: great 여유 있게 성공(레벨업 점수 2) · good 성공(1) · keep 유지(0, 실패 아님) · miss 미달
export const GRADE_CREDIT = { great: 2, good: 1, keep: 0 };
export const GRADE_LABEL = { great: '여유 있게 성공', good: '성공', keep: '유지', miss: '미달' };

// 평가 입력의 기본값: 횟수 종목은 세트별 목표, 버티기는 타이머가 잰 초
export function defaultDone(r) {
  const t = r.targets && r.targets.length ? r.targets : Array(r.totalSets).fill(r.target);
  return r.sets.map((sec, i) => (r.type === 'hold' ? Math.min(Math.round(sec), r.target) : t[i] ?? r.target));
}

// 근력 한 종목: ev = { done: [세트별 실제 횟수·초], form: good|some|bad, effort: easy|ok|hard }
// → { grade, why } (중단한 종목은 grade null — 레벨에 반영하지 않음)
export function gradeStrength(r, ev) {
  if (r.setsDone < r.totalSets) return { grade: null, why: '중간에 멈춰서 이번엔 평가하지 않습니다' };
  const t = r.targets && r.targets.length ? r.targets : Array(r.totalSets).fill(r.target);
  const done = ev.done || defaultDone(r);
  const short = done.map((d, i) => d < t[i]);
  if (short.some(Boolean)) {
    const where = done.map((d, i) => (short[i] ? `${i + 1}세트 ${d}/${t[i]}` : null)).filter(Boolean).join(', ');
    return { grade: 'miss', why: `목표에 못 미쳤어요 (${where})` };
  }
  if (ev.form === 'bad') return { grade: 'miss', why: '자세가 많이 흐트러졌어요 — 바른 자세로 채우는 게 먼저입니다' };
  if (ev.form === 'some') return { grade: 'keep', why: '목표는 채웠지만 자세가 가끔 흐트러졌어요 — 이 레벨에서 자세부터 다듬어요' };
  if (ev.effort === 'hard') return { grade: 'keep', why: '목표는 채웠지만 한계였어요 — 이 레벨을 조금 더 익혀요' };
  const extra = done.every((d, i) => d >= Math.ceil(t[i] * 1.2));
  if (ev.effort === 'easy' || extra) return { grade: 'great', why: extra && ev.effort !== 'easy' ? '목표보다 20% 이상 더 했어요 — 바로 올려도 됩니다' : '여유 있게 채웠어요 — 바로 올려도 됩니다' };
  return { grade: 'good', why: '바른 자세로 목표를 채웠어요' };
}

// 자전거: ev = { followed: 안내대로 따라 했다, over140: 심박이 140을 넘었다, effort }
export function gradeBike(b, ev, completed) {
  if (!b.mainDone) return completed ? { grade: 'miss', why: '루틴 구간을 건너뛴 곳이 있어요' } : { grade: null, why: '중간에 멈춰서 이번엔 평가하지 않습니다' };
  if (ev.over140) return { grade: 'keep', why: '심박이 140을 넘었어요 — 다음엔 세게 구간을 조금 덜 세게, 레벨은 유지' };
  if (!ev.followed) return { grade: 'keep', why: '안내대로 다 따라가진 못했어요 — 이 레벨 유지' };
  if (ev.effort === 'hard') return { grade: 'keep', why: '끝까지 했지만 한계였어요 — 이 레벨을 조금 더 익혀요' };
  if (ev.effort === 'easy') return { grade: 'great', why: '여유 있게 끝냈어요 — 바로 올려도 됩니다' };
  return { grade: 'good', why: '안내대로 끝까지 탔어요' };
}

// 같은 종목 지난번 기록 (오늘 것 제외) — 비교용
export function lastResult(sessions, id, before) {
  for (let i = sessions.length - 1; i >= 0; i--) {
    const s = sessions[i];
    if (s === before) continue;
    const r = id === 'bike' ? s.type === 'bike' && s.bike : s.results && s.results[id];
    if (r && (r.done || r.avgHr)) return { date: s.date, ...r };
  }
  return null;
}

// 자전거: 메인(루틴) 구간을 하나도 건너뛰지 않고 끝까지 탔는가
export function bikeMainDone(ends, steps) {
  const main = steps.filter((s) => s.kind === 'ride' && s.main);
  const done = ends.filter((e) => main.includes(e.step) && e.reason === 'timeout');
  return main.length > 0 && done.length === main.length;
}

export function makeRecord({ type, mode, condition, startedAt, endedAt, completed, quitReason, ends, steps, bikeLv, routine }) {
  const start = new Date(startedAt);
  const rec = {
    date: ymd(start), type, mode, condition, startedAt, endedAt,
    totalSeconds: Math.round((new Date(endedAt) - start) / 1000),
    completed, quitReason: quitReason || null, judged: false,
  };
  if (type === 'strength') rec.results = strengthResults(ends);
  if (type === 'bike') rec.bike = { lv: bikeLv, routine: routine || 'steady', mainDone: bikeMainDone(ends, steps), avgHr: null, resistance: null };
  return rec;
}
