import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextType, streakDays, restSuggested, weekStrip, addDays, doneToday } from '../js/schedule.js';

const S = (date, type, mode = 'normal') => ({ date, type, mode });

test('처음이면 근력부터', () => {
  assert.equal(nextType([]), 'strength');
});

test('근력 다음은 자전거, 자전거 다음은 근력', () => {
  assert.equal(nextType([S('2026-10-01', 'strength')]), 'bike');
  assert.equal(nextType([S('2026-10-01', 'strength'), S('2026-10-02', 'bike')]), 'strength');
});

test('하루 빠져도 순서만 밀린다 — 근력이 이틀 연속 오지 않는다', () => {
  assert.equal(nextType([S('2026-10-01', 'strength'), S('2026-10-05', 'bike')]), 'strength');
});

test('스트레칭만 한 날은 순서에 영향을 주지 않는다', () => {
  assert.equal(nextType([S('2026-10-01', 'strength'), S('2026-10-02', 'stretch')]), 'bike');
});

test('날짜 더하기는 달·해를 넘어간다', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2027-01-01', -1), '2026-12-31');
});

test('어제까지 연속 운동 일수', () => {
  const ss = ['2026-10-04', '2026-10-05', '2026-10-06'].map((d) => S(d, 'bike'));
  assert.equal(streakDays(ss, '2026-10-07'), 3);
  assert.equal(streakDays(ss, '2026-10-08'), 0);
});

test('6일 연속이면 7일째 휴식을 권한다 — 오늘 이미 했으면 안 권한다', () => {
  const ss = [1, 2, 3, 4, 5, 6].map((d) => S(`2026-10-0${d}`, d % 2 ? 'strength' : 'bike'));
  assert.equal(restSuggested(ss, '2026-10-07'), true);
  assert.equal(restSuggested(ss.slice(1), '2026-10-07'), false);
  assert.equal(restSuggested([...ss, S('2026-10-07', 'strength')], '2026-10-07'), false);
});

test('최근 7일 달력 줄', () => {
  const w = weekStrip([S('2026-10-05', 'strength'), S('2026-10-07', 'bike', 'light')], '2026-10-07');
  assert.equal(w.length, 7);
  assert.equal(w[0].date, '2026-10-01');
  assert.equal(w[4].type, 'strength');
  assert.deepEqual(w[6], { date: '2026-10-07', type: 'bike', light: true });
  assert.equal(w[5].type, null);
});

test('오늘 했는지', () => {
  assert.equal(doneToday([S('2026-10-07', 'bike')], '2026-10-07'), true);
  assert.equal(doneToday([S('2026-10-06', 'bike')], '2026-10-07'), false);
});
