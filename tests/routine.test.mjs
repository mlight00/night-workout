import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROUTINE } from '../js/routine.js';

test('웜업은 4개 항목, 합 180초', () => {
  assert.equal(ROUTINE.warmup.length, 4);
  assert.equal(ROUTINE.warmup.reduce((s, x) => s + x.seconds, 0), 180);
});

test('쿨다운은 3개 항목, 합 180초', () => {
  assert.equal(ROUTINE.cooldown.length, 3);
  assert.equal(ROUTINE.cooldown.reduce((s, x) => s + x.seconds, 0), 180);
});

test('메인은 4종목, 순서는 데드행 → 팔굽혀펴기 → 딥스 → 다리들기', () => {
  assert.deepEqual(ROUTINE.main.map((e) => e.id), ['deadhang', 'pushup', 'dips', 'legraise']);
});

test('모든 메인 종목은 3세트', () => {
  for (const e of ROUTINE.main) assert.equal(e.sets, 3, `${e.id} 세트 수`);
});

test('버티기 종목은 seconds, 팔굽혀펴기만 reps + limitSeconds', () => {
  const byId = Object.fromEntries(ROUTINE.main.map((e) => [e.id, e]));
  assert.equal(byId.deadhang.type, 'hold');
  assert.equal(byId.deadhang.seconds, 25);
  assert.equal(byId.dips.seconds, 20);
  assert.equal(byId.legraise.seconds, 20);
  assert.equal(byId.pushup.type, 'reps');
  assert.equal(byId.pushup.reps, 12);
  assert.equal(byId.pushup.limitSeconds, 60);
  assert.equal(byId.pushup.seconds, undefined, 'reps 종목에 seconds가 있으면 안 됨');
});

test('휴식은 팔굽혀펴기만 90초, 나머지는 60초', () => {
  const byId = Object.fromEntries(ROUTINE.main.map((e) => [e.id, e]));
  assert.equal(byId.pushup.restSeconds, 90);
  assert.equal(byId.deadhang.restSeconds, 60);
  assert.equal(byId.dips.restSeconds, 60);
  assert.equal(byId.legraise.restSeconds, 60);
});

test('세트 전 준비 카운트다운은 3초', () => {
  assert.equal(ROUTINE.readySeconds, 3);
});
