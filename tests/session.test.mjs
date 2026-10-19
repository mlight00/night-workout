import { test } from 'node:test';
import assert from 'node:assert/strict';
import { strengthResults, gradeStrength, gradeBike, defaultDone, lastResult, bikeMainDone, makeRecord } from '../js/session.js';
import { strengthDay, bikeDay } from '../js/timeline.js';
import { initLevels } from '../js/levels.js';

const S = strengthDay(initLevels().levels);
const works = (id) => S.filter((s) => s.exId === id);
const end = (step, actualSeconds, reason = 'timeout') => ({ type: 'stepEnd', step, actualSeconds, reason });

test('버티기: 세 세트 모두 끝까지 → 완주, 하나라도 일찍 끝내면 미달', () => {
  const ok = strengthResults(works('hang').map((w) => end(w, 20)));
  assert.equal(ok.hang.setsDone, 3);
  assert.equal(ok.hang.allHeld, true);
  assert.deepEqual(ok.hang.sets, [20, 20, 20]);
  const ng = strengthResults(works('hang').map((w, i) => end(w, i === 2 ? 14.2 : 20, i === 2 ? 'skip' : 'timeout')));
  assert.equal(ng.hang.allHeld, false);
  assert.deepEqual(ng.hang.sets, [20, 20, 14]);
});

test('웜업·휴식·쿨다운은 결과에 들어가지 않는다', () => {
  const r = strengthResults(S.slice(0, 6).map((s) => end(s, s.seconds)));
  assert.deepEqual(Object.keys(r), ['squat']);
});

test('평가 기본값: 횟수는 세트별 목표, 버티기는 타이머가 잰 초', () => {
  const p = strengthResults(works('push').map((w) => end(w, 30, 'skip'))).push;
  assert.deepEqual(p.targets, [15, 10, 8]);
  assert.deepEqual(defaultDone(p), [15, 10, 8]);
  const h = strengthResults(works('hang').map((w, i) => end(w, i === 2 ? 14.2 : 20))).hang;
  assert.deepEqual(defaultDone(h), [20, 20, 14]);
});

test('등급: 목표·자세·힘든 정도로 — 여유 있게 성공 / 성공 / 유지 / 미달', () => {
  const p = strengthResults(works('push').map((w) => end(w, 30, 'skip'))).push;
  const g = (ev) => gradeStrength(p, { done: [15, 10, 8], form: 'good', effort: 'ok', ...ev }).grade;
  assert.equal(g({}), 'good');
  assert.equal(g({ effort: 'easy' }), 'great');
  assert.equal(g({ done: [18, 12, 10] }), 'great'); // 목표보다 20% 이상
  assert.equal(g({ effort: 'hard' }), 'keep');
  assert.equal(g({ form: 'some' }), 'keep');
  assert.equal(g({ form: 'bad' }), 'miss');
  assert.equal(g({ done: [15, 9, 8] }), 'miss');
  assert.match(gradeStrength(p, { done: [15, 9, 7], form: 'good', effort: 'ok' }).why, /2세트 9\/10, 3세트 7\/8/);
});

test('버티기: 타이머보다 일찍 놓았으면 미달 (평가에서 초를 줄여도 미달)', () => {
  const h = strengthResults(works('hang').map((w, i) => end(w, i === 2 ? 14.2 : 20))).hang;
  assert.equal(gradeStrength(h, { form: 'good', effort: 'ok' }).grade, 'miss');
  const ok = strengthResults(works('hang').map((w) => end(w, 20))).hang;
  assert.equal(gradeStrength(ok, { form: 'good', effort: 'ok' }).grade, 'good');
  assert.equal(gradeStrength(ok, { done: [20, 20, 15], form: 'good', effort: 'ok' }).grade, 'miss');
});

test('중간에 그만둬서 세트가 모자라면 평가하지 않는다 (레벨 그대로)', () => {
  const h = strengthResults(works('hang').slice(0, 2).map((w) => end(w, 20))).hang;
  assert.equal(gradeStrength(h, { form: 'good', effort: 'ok' }).grade, null);
});

test('자전거 등급: 140 넘으면 유지, 여유면 바로 레벨업, 중간에 멈추면 평가 안 함', () => {
  const b = { mainDone: true };
  assert.equal(gradeBike(b, { followed: true, over140: false, effort: 'ok' }, true).grade, 'good');
  assert.equal(gradeBike(b, { followed: true, over140: false, effort: 'easy' }, true).grade, 'great');
  assert.equal(gradeBike(b, { followed: true, over140: true, effort: 'easy' }, true).grade, 'keep');
  assert.equal(gradeBike(b, { followed: false, over140: false, effort: 'ok' }, true).grade, 'keep');
  assert.equal(gradeBike({ mainDone: false }, {}, true).grade, 'miss');
  assert.equal(gradeBike({ mainDone: false }, {}, false).grade, null);
});

test('지난번 기록 찾기 (오늘 것 제외)', () => {
  const a = { date: '2026-10-12', type: 'strength', results: { push: { lv: 1, done: [15, 10, 7] } } };
  const b = { date: '2026-10-14', type: 'strength', results: { push: { lv: 1, done: [15, 10, 8] } } };
  assert.deepEqual(lastResult([a, b], 'push', b).done, [15, 10, 7]);
  assert.equal(lastResult([b], 'push', b), null);
});

test('자전거: 루틴(메인) 구간을 전부 끝까지 타야 완주', () => {
  const b = bikeDay(5);
  const ends = b.map((s) => end(s, s.seconds));
  assert.equal(bikeMainDone(ends, b), true);
  const hard = b.find((s) => s.zone === 'hard');
  assert.equal(bikeMainDone(ends.map((e) => (e.step === hard ? end(hard, 20, 'skip') : e)), b), false);
  assert.equal(bikeMainDone(ends.slice(0, 2), b), false);
  const warm = b.find((s) => s.zone === 'build'); // 웜업은 건너뛰어도 완주
  assert.equal(bikeMainDone(ends.map((e) => (e.step === warm ? end(warm, 20, 'skip') : e)), b), true);
});

test('기록 만들기', () => {
  const r = makeRecord({
    type: 'bike', mode: 'normal', condition: 'good', startedAt: '2026-10-10T13:00:00.000Z', endedAt: '2026-10-10T13:20:00.000Z',
    completed: true, ends: [], steps: bikeDay(1), bikeLv: 1, routine: 'interval',
  });
  assert.equal(r.totalSeconds, 1200);
  assert.equal(r.type, 'bike');
  assert.deepEqual(r.bike, { lv: 1, routine: 'interval', mainDone: false, rideMin: 0, avgHr: null, resistance: null });
  assert.equal(r.results, undefined); // 버티기 단계를 안 했으면 결과 없음
  assert.equal(r.judged, false);
});

test('자전거 날: 탄 시간(분)과 벽에 기대 버티기 결과도 기록', () => {
  const b = bikeDay(1, 'normal', 'interval', 1);
  const ends = b.map((s) => end(s, s.seconds));
  const r = makeRecord({
    type: 'bike', mode: 'normal', condition: 'good', startedAt: '2026-10-21T13:00:00.000Z', endedAt: '2026-10-21T13:30:00.000Z',
    completed: true, ends, steps: b, bikeLv: 1, routine: 'interval',
  });
  assert.equal(r.bike.rideMin, (120 + 180 + 720 + 120) / 60);
  assert.deepEqual(Object.keys(r.results), ['wall']);
  assert.deepEqual(r.results.wall.sets, [30, 30, 30]);
});
