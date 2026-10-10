import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countdownPlan, needsCountdown } from '../js/beeps.js';
import { strengthDay, bikeDay } from '../js/timeline.js';
import { initLevels } from '../js/levels.js';

test('3초 남았을 때: 지금·1초 뒤·2초 뒤 짧게, 3초 뒤 길게', () => {
  assert.deepEqual(countdownPlan(3), [
    { at: 0, long: false }, { at: 1, long: false }, { at: 2, long: false }, { at: 3, long: true },
  ]);
});

test('조금 늦게 예약해도(3.2초) 끝나는 순간에 정확히 길게', () => {
  const p = countdownPlan(3.2);
  assert.equal(p.at(-1).at, 3.2);
  assert.ok(Math.abs(p[0].at - 0.2) < 1e-9);
});

test('이미 2초 남짓이면 남은 짧은 음만', () => {
  const p = countdownPlan(2.1);
  assert.equal(p.filter((b) => !b.long).length, 2);
  assert.equal(p.at(-1).long, true);
});

test('휴식과 준비는 카운트다운, 운동·웜업·쿨다운은 아니다', () => {
  const s = strengthDay(initLevels().levels);
  for (const x of s) assert.equal(needsCountdown(x), x.kind === 'rest', `${x.kind}`);
});

test('자전거는 언덕 직전 구간만 카운트다운', () => {
  const b = bikeDay(6);
  for (const x of b) assert.equal(needsCountdown(x), x.nextZone === 'hill');
});
