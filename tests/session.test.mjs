import { test } from 'node:test';
import assert from 'node:assert/strict';
import { strengthResults, judge, bikeMainDone, makeRecord } from '../js/session.js';
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
  assert.deepEqual(Object.keys(r), ['hang']);
});

test('판정: 버티기는 완주 + 자세 체크, 횟수는 횟수 체크 + 자세 체크', () => {
  const h = strengthResults(works('hang').map((w) => end(w, 20))).hang;
  assert.equal(judge(h, { form: true }), true);
  assert.equal(judge(h, { form: false }), false);
  const p = strengthResults(works('push').map((w) => end(w, 30, 'skip'))).push;
  assert.equal(judge(p, { reps: true, form: true }), true);
  assert.equal(judge(p, { reps: false, form: true }), false);
});

test('중간에 그만둬서 세트가 모자라면 미달', () => {
  const h = strengthResults(works('hang').slice(0, 2).map((w) => end(w, 20))).hang;
  assert.equal(judge(h, { form: true }), false);
});

test('자전거: 메인 구간을 전부 끝까지 타야 완주', () => {
  const b = bikeDay(5);
  const ends = b.map((s) => end(s, s.seconds));
  assert.equal(bikeMainDone(ends, b), true);
  const hill = b.find((s) => s.zone === 'hill');
  assert.equal(bikeMainDone(ends.map((e) => (e.step === hill ? end(hill, 20, 'skip') : e)), b), false);
  assert.equal(bikeMainDone(ends.slice(0, 2), b), false);
});

test('기록 만들기', () => {
  const r = makeRecord({
    type: 'bike', mode: 'normal', condition: 'good', startedAt: '2026-10-10T13:00:00.000Z', endedAt: '2026-10-10T13:20:00.000Z',
    completed: true, ends: [], steps: bikeDay(1), bikeLv: 1,
  });
  assert.equal(r.totalSeconds, 1200);
  assert.equal(r.type, 'bike');
  assert.deepEqual(r.bike, { lv: 1, mainDone: false, avgHr: null, resistance: null });
  assert.equal(r.judged, false);
});
