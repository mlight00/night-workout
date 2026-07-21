import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRecord, createStore } from '../js/storage.js';

const fakeStorage = () => {
  const mem = new Map();
  return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)) };
};

const endEvent = (over) => ({
  type: 'stepEnd',
  step: { kind: 'work', name: '데드행', exerciseId: 'deadhang', type: 'hold', seconds: 25, setNo: 1, totalSets: 3 },
  actualSeconds: 25,
  reason: 'timeout',
  ...over,
});

test('work 단계만 기록에 남는다 — 웜업·휴식·쿨다운은 버린다', () => {
  const rec = buildRecord({
    events: [
      endEvent(),
      { type: 'stepEnd', step: { kind: 'rest', name: '휴식', seconds: 60 }, actualSeconds: 60, reason: 'timeout' },
      { type: 'stepEnd', step: { kind: 'warmup', name: '어깨 회전', seconds: 40 }, actualSeconds: 40, reason: 'timeout' },
    ],
    startedAt: '2026-07-21T13:02:11.000Z',
    endedAt: '2026-07-21T13:26:02.000Z',
    completed: true,
  });
  assert.equal(rec.sets.length, 1);
  assert.equal(rec.sets[0].exerciseId, 'deadhang');
});

test('버티기 세트는 목표 시간과 실제 시간을 남긴다', () => {
  const rec = buildRecord({
    events: [endEvent({ actualSeconds: 19, reason: 'skip' })],
    startedAt: '2026-07-21T13:02:11.000Z', endedAt: '2026-07-21T13:26:02.000Z', completed: true,
  });
  assert.deepEqual(rec.sets[0], {
    exerciseId: 'deadhang', setNo: 1,
    targetSeconds: 25, targetReps: null,
    actualSeconds: 19, actualReps: null,
    source: 'estimated',
  });
});

test('팔굽혀펴기 세트는 목표 횟수를 남기고 실제 횟수는 비워둔다 (1단계)', () => {
  const rec = buildRecord({
    events: [endEvent({
      step: { kind: 'work', name: '팔굽혀펴기', exerciseId: 'pushup', type: 'reps', reps: 12, seconds: 60, setNo: 2, totalSets: 3 },
      actualSeconds: 31, reason: 'skip',
    })],
    startedAt: '2026-07-21T13:02:11.000Z', endedAt: '2026-07-21T13:26:02.000Z', completed: true,
  });
  assert.deepEqual(rec.sets[0], {
    exerciseId: 'pushup', setNo: 2,
    targetSeconds: null, targetReps: 12,
    actualSeconds: 31, actualReps: null,
    source: 'estimated',
  });
});

test('소수점 초는 반올림해서 저장한다', () => {
  const rec = buildRecord({
    events: [endEvent({ actualSeconds: 18.73, reason: 'skip' })],
    startedAt: '2026-07-21T13:02:11.000Z', endedAt: '2026-07-21T13:26:02.000Z', completed: true,
  });
  assert.equal(rec.sets[0].actualSeconds, 19);
});

test('날짜는 시작 시각의 현지 날짜, 총 소요 시간은 시작~종료 차이', () => {
  const rec = buildRecord({
    events: [endEvent()],
    startedAt: '2026-07-21T13:02:11.000Z', endedAt: '2026-07-21T13:26:02.000Z', completed: true,
  });
  assert.match(rec.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(rec.totalSeconds, 1431);
  assert.equal(rec.completed, true);
});

test('저장하고 다시 불러올 수 있다', () => {
  const s = fakeStorage();
  const store = createStore(s);
  const rec = buildRecord({
    events: [endEvent()],
    startedAt: '2026-07-21T13:02:11.000Z', endedAt: '2026-07-21T13:26:02.000Z', completed: true,
  });
  store.saveSession(rec);
  assert.equal(createStore(s).allSessions().length, 1);
  assert.equal(createStore(s).lastSession().sets[0].exerciseId, 'deadhang');
});

test('여러 번 저장하면 쌓이고, 날짜 오름차순으로 나온다', () => {
  const s = fakeStorage();
  const store = createStore(s);
  const mk = (date) => ({ date, startedAt: '', endedAt: '', totalSeconds: 100, completed: true, sets: [] });
  store.saveSession(mk('2026-07-23'));
  store.saveSession(mk('2026-07-21'));
  assert.deepEqual(store.allSessions().map((r) => r.date), ['2026-07-21', '2026-07-23']);
  assert.equal(store.lastSession().date, '2026-07-23');
});

test('기록이 없으면 빈 배열과 null', () => {
  const store = createStore(fakeStorage());
  assert.deepEqual(store.allSessions(), []);
  assert.equal(store.lastSession(), null);
});

test('저장된 값이 깨져 있어도 죽지 않고 빈 상태로 시작한다', () => {
  const s = fakeStorage();
  s.setItem('nightWorkout.v1', '{그럴듯하지만 깨진 JSON');
  const store = createStore(s);
  assert.deepEqual(store.allSessions(), []);
});

test('저장소를 못 쓰는 환경에서도 앱이 죽지 않는다', () => {
  const broken = {
    getItem: () => { throw new Error('차단됨'); },
    setItem: () => { throw new Error('차단됨'); },
  };
  const store = createStore(broken);
  assert.equal(store.available, false);
  assert.deepEqual(store.allSessions(), []);
  store.saveSession({ date: '2026-07-21', sets: [] }); // 던지지 않아야 한다
});
