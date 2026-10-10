import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, emptyData, validate, exportJson, importJson, KEY, V1_KEY } from '../js/store.js';

const fake = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), m };
};

test('처음엔 빈 문서 — 시작 레벨이 들어 있다', () => {
  const d = createStore(fake()).load();
  assert.equal(d.v, 2);
  assert.equal(d.state.levels.push.lv, 3);
  assert.ok(validate(d));
});

test('저장하고 다시 불러온다', () => {
  const st = fake();
  const s = createStore(st);
  const d = emptyData();
  d.sessions.push({ date: '2026-10-10', type: 'bike' });
  d.weights.push({ date: '2026-10-10', kg: 90.4 });
  assert.equal(s.save(d), true);
  const back = createStore(st).load();
  assert.equal(back.sessions.length, 1);
  assert.equal(back.weights[0].kg, 90.4);
});

test('깨진 값이면 빈 문서로 시작하고 죽지 않는다', () => {
  const st = fake();
  st.setItem(KEY, '{깨짐');
  assert.ok(validate(createStore(st).load()));
});

test('저장소를 못 쓰는 환경에서도 죽지 않는다', () => {
  const s = createStore({ getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } });
  assert.equal(s.available, false);
  assert.ok(validate(s.load()));
  assert.equal(s.save(emptyData()), false);
});

test('v1 기록은 지우지 않고 개수만 읽는다', () => {
  const st = fake();
  st.setItem(V1_KEY, JSON.stringify([{ date: '2026-07-22' }, { date: '2026-07-24' }]));
  const s = createStore(st);
  assert.equal(s.legacyCount(), 2);
  s.save(emptyData());
  assert.ok(st.m.has(V1_KEY));
});

test('내보내기 → 가져오기 왕복', () => {
  const d = emptyData();
  d.weights.push({ date: '2026-10-10', kg: 89.9 });
  const back = importJson(exportJson(d));
  assert.equal(back.weights[0].kg, 89.9);
  assert.ok(validate(back));
});

test('엉뚱한 파일은 이유와 함께 거절', () => {
  assert.throws(() => importJson('not json'), /읽을 수 없습니다/);
  assert.throws(() => importJson('{"hello":1}'), /기록 파일이 아닙니다/);
});

test('레벨이 범위를 벗어난 파일은 거절', () => {
  const d = emptyData();
  d.state.levels.hang.lv = 99;
  assert.equal(validate(d), false);
});
