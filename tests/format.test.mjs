import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatClock } from '../js/format.js';

test('60초 미만은 분 없이 초만', () => {
  assert.equal(formatClock(25), '25');
  assert.equal(formatClock(5), '5');
  assert.equal(formatClock(0), '0');
});

test('60초 이상은 M:SS', () => {
  assert.equal(formatClock(60), '1:00');
  assert.equal(formatClock(90), '1:30');
  assert.equal(formatClock(1521), '25:21');
});

test('음수는 0으로 취급', () => {
  assert.equal(formatClock(-3), '0');
});

test('소수점은 올림 — 0.2초 남았으면 아직 1초로 보여야 한다', () => {
  assert.equal(formatClock(0.2), '1');
  assert.equal(formatClock(24.7), '25');
});
