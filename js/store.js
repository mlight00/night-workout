// 기록 저장 — 폰 안(localStorage)에만. storage 주입식이라 테스트 가능.
// 문서 하나에 전부: { v:2, sessions, state:{levels,pending}, weights }

import { initLevels } from './levels.js';
import { STRENGTH, BIKE } from './program.js';

export const KEY = 'nightWorkout.v2';
export const V1_KEY = 'nightWorkout.v1';

export function emptyData() {
  return { v: 2, sessions: [], state: initLevels(), weights: [] };
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
