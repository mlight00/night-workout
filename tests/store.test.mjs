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
  assert.equal(d.ladder, 3);
  assert.deepEqual(d.walks, []);
  assert.equal(d.state.levels.wall.lv, 1);
  assert.equal(d.state.levels.bridge.lv, 1);
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

test('예전 팔굽혀펴기 레벨은 새 사다리로 옮기고, 다른 기록은 그대로', () => {
  const st = fake();
  const old = emptyData();
  delete old.ladder;
  old.state.levels.push = { lv: 4, ok: 1, ng: 0 };
  old.state.levels.hang = { lv: 2, ok: 1, ng: 0 };
  old.state.pending = ['push', 'hang'];
  old.sessions = [
    { date: '2026-10-11', type: 'strength', results: { push: { lv: 3, name: '팔굽혀펴기' }, hang: { lv: 1 } } },
    { date: '2026-10-12', type: 'bike', bike: { lv: 1 } },
  ];
  old.weights = [{ date: '2026-10-11', kg: 90.2 }];
  st.setItem(KEY, JSON.stringify(old));
  const d = createStore(st).load();
  assert.deepEqual(d.state.levels.push, { lv: 3, ok: 0, ng: 0 });
  assert.deepEqual(d.state.levels.hang, { lv: 2, ok: 1, ng: 0 });
  assert.deepEqual(d.state.pending, ['hang']);
  assert.equal(d.sessions[0].results.push.lv, 3);
  assert.equal(d.sessions[0].results.hang.lv, 1);
  assert.equal(d.sessions.length, 2);
  assert.equal(d.weights[0].kg, 90.2);
  assert.equal(d.ladder, 3);
  // 한 번 옮긴 기록은 다시 옮기지 않는다
  d.state.levels.push = { lv: 5, ok: 0, ng: 0 };
  st.setItem(KEY, JSON.stringify(d));
  assert.equal(createStore(st).load().state.levels.push.lv, 5);
});

test('예전 높은 레벨도 비슷한 난이도로 (12회×3 → 15·12·10, 20회×3 → 25·20·15)', () => {
  for (const [from, to] of [[5, 4], [6, 6], [7, 9]]) {
    const d = emptyData();
    delete d.ladder;
    d.state.levels.push = { lv: from, ok: 0, ng: 0 };
    assert.equal(importJson(JSON.stringify(d)).state.levels.push.lv, to);
  }
});

test('사다리 2판 기록: 팔굽혀펴기 레벨 +2 (쉬운 단계 2개가 아래에 생김), 진행 점수는 그대로', () => {
  const d = emptyData();
  d.ladder = 2;
  d.state.levels.push = { lv: 1, ok: 1, ng: 0 };
  d.sessions = [{ date: '2026-10-16', type: 'strength', results: { push: { lv: 1, done: [15, 10, 8] } } }];
  const m = importJson(JSON.stringify(d));
  assert.deepEqual(m.state.levels.push, { lv: 3, ok: 1, ng: 0 });
  assert.equal(m.sessions[0].results.push.lv, 3);
  assert.equal(m.ladder, 3);
});

test('걷기 기록이 없던 예전 문서도 불러온다 (걷기 []·새 종목 레벨 채움)', () => {
  const d = emptyData();
  delete d.walks;
  delete d.state.levels.wall;
  delete d.state.levels.bridge;
  const m = importJson(JSON.stringify(d));
  assert.deepEqual(m.walks, []);
  assert.equal(m.state.levels.wall.lv, 1);
  assert.equal(m.state.levels.bridge.lv, 1);
});
