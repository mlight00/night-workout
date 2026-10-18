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

// results: { id: 등급 } — great(+2) · good(+1) · keep(그대로, 실패 아님) · miss(실패), true/false도 받는다(good/miss).
// light 모드면 아무것도 바꾸지 않는다. pending에는 점수만큼 id를 넣어 둔다(다음에 피곤하면 그만큼 무효).
const CREDIT = { great: 2, good: 1, keep: 0 };
export function applyResults(state, results, mode) {
  if (mode === 'light') return { ...state, pending: [] };
  const levels = { ...state.levels };
  const pending = [];
  for (const [id, v] of Object.entries(results)) {
    const cur = levels[id];
    const g = v === true ? 'good' : v === false ? 'miss' : v;
    if (!cur || !g) continue;
    if (g === 'miss') {
      levels[id] = { ...cur, ok: 0, ng: cur.ng + 1 };
    } else {
      levels[id] = { ...cur, ok: cur.ok + CREDIT[g], ng: 0 };
      for (let i = 0; i < CREDIT[g]; i++) pending.push(id);
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
