import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initLevels, applyResults, applyCondition, canUp, suggestDown, canDown, levelUp, levelDown } from '../js/levels.js';

test('시작 레벨: 팔굽혀펴기만 3, 나머지 1', () => {
  const s = initLevels();
  assert.deepEqual(Object.fromEntries(Object.entries(s.levels).map(([k, v]) => [k, v.lv])), { hang: 1, push: 1, squat: 1, dip: 1, leg: 1, bike: 1 });
  assert.deepEqual(s.pending, []);
});

test('한 번 성공으로는 레벨업 불가, 두 번 연속 성공하면 가능', () => {
  let s = applyResults(initLevels(), { hang: true }, 'normal');
  assert.equal(canUp(s, 'hang'), false);
  s = applyResults(s, { hang: true }, 'normal');
  assert.equal(canUp(s, 'hang'), true);
});

test('중간에 한 번 미달하면 연속 성공이 0부터 다시', () => {
  let s = applyResults(initLevels(), { hang: true }, 'normal');
  s = applyResults(s, { hang: false }, 'normal');
  s = applyResults(s, { hang: true }, 'normal');
  assert.equal(canUp(s, 'hang'), false);
});

test('가볍게 한 날은 레벨 판정에 들어가지 않는다', () => {
  let s = applyResults(initLevels(), { hang: true }, 'normal');
  s = applyResults(s, { hang: true }, 'light');
  assert.equal(s.levels.hang.ok, 1);
  assert.deepEqual(s.pending, []);
});

test('다음 운동 때 피곤하면 직전 성공을 무효로 한다', () => {
  let s = applyResults(initLevels(), { hang: true, push: false }, 'normal');
  s = applyResults(s, { hang: true }, 'normal');
  assert.equal(canUp(s, 'hang'), true);
  s = applyCondition(s, 'tired');
  assert.equal(s.levels.hang.ok, 1);
  assert.equal(canUp(s, 'hang'), false);
  assert.deepEqual(s.pending, []);
});

test('컨디션이 좋으면 성공은 그대로 확정', () => {
  let s = applyResults(initLevels(), { hang: true }, 'normal');
  s = applyCondition(s, 'good');
  assert.equal(s.levels.hang.ok, 1);
  assert.deepEqual(s.pending, []);
});

test('두 번 연속 미달하면 레벨다운을 권한다 (레벨 1이면 권하지 않음)', () => {
  let s = applyResults(levelUp(initLevels(), 'push'), { push: false, hang: false }, 'normal');
  s = applyResults(s, { push: false, hang: false }, 'normal');
  assert.equal(suggestDown(s, 'push'), true);
  assert.equal(suggestDown(s, 'hang'), false);
  assert.equal(canDown(s, 'hang'), false);
});

test('레벨업·다운은 카운트를 0으로, 범위를 넘지 않는다', () => {
  let s = levelUp(initLevels(), 'push');
  assert.deepEqual(s.levels.push, { lv: 2, ok: 0, ng: 0 });
  s = levelDown(levelDown(levelDown(levelDown(s, 'push'), 'push'), 'push'), 'push');
  s = levelDown(s, 'push');
  assert.equal(s.levels.push.lv, 1);
  for (let i = 0; i < 20; i++) s = levelUp(s, 'push');
  assert.equal(s.levels.push.lv, 7);
  assert.equal(canUp({ ...s, levels: { ...s.levels, push: { lv: 7, ok: 5, ng: 0 } } }, 'push'), false);
});

test('원래 상태 객체는 바꾸지 않는다', () => {
  const s0 = initLevels();
  applyResults(s0, { hang: true }, 'normal');
  levelUp(s0, 'hang');
  assert.equal(s0.levels.hang.ok, 0);
  assert.equal(s0.levels.hang.lv, 1);
});

test('등급별 레벨 점수: 여유 있게 성공은 바로 레벨업 가능, 유지는 실패가 아니다', () => {
  let s = applyResults(initLevels(), { push: 'great', hang: 'good', squat: 'keep', dip: 'miss' }, 'normal');
  assert.equal(canUp(s, 'push'), true);
  assert.equal(canUp(s, 'hang'), false);
  assert.deepEqual(s.levels.squat, { lv: 1, ok: 0, ng: 0 });
  assert.equal(s.levels.dip.ng, 1);
  assert.deepEqual(s.pending, ['push', 'push', 'hang']);
  // 다음 운동 때 피곤하면 그만큼 무효
  s = applyCondition(s, 'tired');
  assert.equal(s.levels.push.ok, 0);
  assert.equal(s.levels.hang.ok, 0);
  // 유지는 연속 미달을 끊는다
  s = applyResults(s, { dip: 'keep' }, 'normal');
  assert.equal(s.levels.dip.ng, 0);
});
