// 레벨 상태 — 같은 레벨 2번 연속 성공해야 레벨업 가능, 2번 연속 미달이면 레벨다운 권유.
// 다음 운동 시작 때 '피곤함/아픈 곳'이면 직전 성공을 무효로 한다.
// 상태는 바꾸지 않고 새 객체를 돌려준다.

import { STRENGTH, BIKE, maxLevel } from './program.js';

export const UP_AFTER = 2;
export const DOWN_AFTER = 2;

export function initLevels() {
  const levels = {};
  for (const e of [...STRENGTH, BIKE]) levels[e.id] = { lv: e.start, ok: 0, ng: 0 };
  return { levels, pending: [] };
}

// results: { id: true|false } — light 모드면 아무것도 바꾸지 않는다
export function applyResults(state, results, mode) {
  if (mode === 'light') return { ...state, pending: [] };
  const levels = { ...state.levels };
  const pending = [];
  for (const [id, success] of Object.entries(results)) {
    const cur = levels[id];
    if (!cur) continue;
    if (success) {
      levels[id] = { ...cur, ok: cur.ok + 1, ng: 0 };
      pending.push(id);
    } else {
      levels[id] = { ...cur, ok: 0, ng: cur.ng + 1 };
    }
  }
  return { levels, pending };
}

export function applyCondition(state, condition) {
  if (condition !== 'tired' && condition !== 'pain') return { ...state, pending: [] };
  const levels = { ...state.levels };
  for (const id of state.pending) {
    const cur = levels[id];
    if (cur) levels[id] = { ...cur, ok: Math.max(0, cur.ok - 1) };
  }
  return { levels, pending: [] };
}

export const canUp = (state, id) => state.levels[id].ok >= UP_AFTER && state.levels[id].lv < maxLevel(id);
export const suggestDown = (state, id) => state.levels[id].ng >= DOWN_AFTER && state.levels[id].lv > 1;
export const canDown = (state, id) => state.levels[id].lv > 1;

function shift(state, id, d) {
  const cur = state.levels[id];
  const lv = Math.max(1, Math.min(maxLevel(id), cur.lv + d));
  return { ...state, levels: { ...state.levels, [id]: { lv, ok: 0, ng: 0 } }, pending: state.pending.filter((x) => x !== id) };
}

export const levelUp = (state, id) => shift(state, id, +1);
export const levelDown = (state, id) => shift(state, id, -1);
