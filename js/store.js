// 기록 저장 — 폰 안(localStorage)에만. storage 주입식이라 테스트 가능.
// 문서 하나에 전부: { v:2, ladder, sessions, state:{levels,pending}, weights }

import { initLevels } from './levels.js';
import { STRENGTH, BIKE } from './program.js';

export const KEY = 'nightWorkout.v2';
export const V1_KEY = 'nightWorkout.v1';
export const LADDER = 2; // 레벨 사다리 판 — 사다리를 바꾸면 올리고 migrate()에 옮기는 법을 적는다

export function emptyData() {
  return { v: 2, ladder: LADDER, sessions: [], state: initLevels(), weights: [] };
}

// 사다리 2판 (2026-10-14): 팔굽혀펴기에서 경사 팔굽혀펴기를 빼고 세트별 횟수(15·10·8회~)로.
// 예전 레벨 → 새 레벨: 경사·8회·10회 → 1(15·10·8), 12회 → 2(15·12·10), 15회 → 4(18·15·12), 20회 → 7
const PUSH_V2 = [1, 1, 1, 1, 1, 2, 4, 7];
function migrate(d) {
  if (!d || !d.state || !d.state.levels || d.ladder >= LADDER) return d;
  const to = (lv) => PUSH_V2[Math.max(1, Math.min(7, lv | 0))];
  const p = d.state.levels.push;
  if (p) d.state.levels.push = { lv: to(p.lv), ok: 0, ng: 0 };
  if (Array.isArray(d.state.pending)) d.state.pending = d.state.pending.filter((x) => x !== 'push');
  for (const s of d.sessions || []) if (s && s.results && s.results.push) s.results.push = { ...s.results.push, lv: to(s.results.push.lv) };
  d.ladder = LADDER;
  return d;
}

export function validate(d) {
  if (!d || d.v !== 2 || !Array.isArray(d.sessions) || !Array.isArray(d.weights)) return false;
  if (!d.state || !d.state.levels || !Array.isArray(d.state.pending)) return false;
  return [...STRENGTH, BIKE].every((e) => {
    const l = d.state.levels[e.id];
    return l && Number.isInteger(l.lv) && l.lv >= 1 && l.lv <= e.levels.length;
  });
}

// 프로그램에 새 종목이 생겨도 깨지지 않게 빠진 레벨은 시작값으로 채운다
function repair(d) {
  if (!d || !d.state || !d.state.levels) return d;
  migrate(d);
  const base = initLevels();
  d.state.levels = { ...base.levels, ...d.state.levels };
  return d;
}

export function createStore(storage) {
  let available = true;
  try { storage.getItem(KEY); } catch { available = false; }

  return {
    available,
    load() {
      if (!available) return emptyData();
      try {
        const raw = storage.getItem(KEY);
        if (!raw) return emptyData();
        const d = repair(JSON.parse(raw));
        return validate(d) ? d : emptyData();
      } catch {
        return emptyData();
      }
    },
    save(d) {
      if (!available) return false;
      try { storage.setItem(KEY, JSON.stringify(d)); return true; } catch { return false; }
    },
    legacyCount() {
      if (!available) return 0;
      try {
        const a = JSON.parse(storage.getItem(V1_KEY) || '[]');
        return Array.isArray(a) ? a.length : 0;
      } catch {
        return 0;
      }
    },
  };
}

export function exportJson(d) {
  return JSON.stringify({ ...d, exportedAt: new Date().toISOString() }, null, 1);
}

export function importJson(text) {
  let d;
  try { d = JSON.parse(text); } catch { throw new Error('파일을 읽을 수 없습니다'); }
  delete d.exportedAt;
  if (!validate(repair(d))) throw new Error('야간 운동 기록 파일이 아닙니다');
  return d;
}
