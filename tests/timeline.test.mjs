import { test } from 'node:test';
import assert from 'node:assert/strict';
import { strengthDay, bikeDay, stretchDay, totalSeconds } from '../js/timeline.js';
import { initLevels, levelUp } from '../js/levels.js';

const L = initLevels().levels;

test('근력 날: 웜업 3개 → 준비 → 5종목×3세트(사이 휴식) → 쿨다운 3개', () => {
  const s = strengthDay(L);
  const works = s.filter((x) => x.kind === 'work');
  assert.equal(works.length, 15);
  assert.deepEqual(s.slice(0, 3).map((x) => x.kind), ['warmup', 'warmup', 'warmup']);
  assert.equal(s[3].kind, 'rest');
  assert.equal(s[3].prep, true);
  assert.equal(s[3].seconds, 20);
  assert.deepEqual(s.slice(-3).map((x) => x.kind), ['cooldown', 'cooldown', 'cooldown']);
});

test('모든 운동 단계 바로 앞은 휴식(또는 준비) — 비프음 카운트다운이 들어갈 자리', () => {
  const s = strengthDay(L);
  s.forEach((x, i) => { if (x.kind === 'work') assert.equal(s[i - 1].kind, 'rest', `${i}`); });
});

test('휴식은 다음 운동 정보를 들고 있다', () => {
  const s = strengthDay(L);
  s.forEach((x, i) => { if (x.kind === 'rest') assert.equal(x.next, s[i + 1]); });
});

test('마지막 운동 뒤에는 휴식 없이 바로 쿨다운', () => {
  const s = strengthDay(L);
  const last = s.findLastIndex((x) => x.kind === 'work');
  assert.equal(s[last + 1].kind, 'cooldown');
});

test('시작 레벨 근력 날의 첫 운동은 데드행 20초, 휴식은 팔굽혀펴기만 90초', () => {
  const s = strengthDay(L);
  const w = s.find((x) => x.kind === 'work');
  assert.deepEqual([w.name, w.type, w.seconds, w.setNo, w.totalSets, w.pose], ['데드행', 'hold', 20, 1, 3, 'deadhang']);
  const rests = s.filter((x) => x.kind === 'rest' && !x.prep);
  assert.ok(rests.filter((r) => r.seconds === 90).length === 3);
});

test('매달리기 뒤 휴식은 "발판 딛고 내려오세요"를 들고 있다', () => {
  const s = strengthDay(L);
  const r = s.find((x, i) => x.kind === 'rest' && s[i - 1] && s[i - 1].exId === 'hang');
  assert.match(r.after, /발판/);
});

test('횟수 종목은 제한시간을 길이로, 목표 횟수를 target으로', () => {
  const w = strengthDay(L).find((x) => x.exId === 'push');
  assert.deepEqual([w.type, w.target, w.seconds], ['reps', 8, 42]);
});

test('레벨이 바뀌면 동작이 바뀐다', () => {
  let st = initLevels();
  for (let i = 0; i < 4; i++) st = levelUp(st, 'hang');
  const w = strengthDay(st.levels).find((x) => x.exId === 'hang');
  assert.equal(w.name, '스캐풀라 풀업');
});

test('가볍게 모드: 2세트, 휴식 +15초', () => {
  const s = strengthDay(L, 'light');
  assert.equal(s.filter((x) => x.kind === 'work').length, 10);
  const rests = s.filter((x) => x.kind === 'rest' && !x.prep).map((x) => x.seconds);
  assert.ok(rests.includes(75) && rests.includes(105));
});

test('근력 날 길이는 30분 안팎 (시작 레벨, 횟수 종목 제한시간 기준 최대)', () => {
  const t = totalSeconds(strengthDay(L));
  assert.ok(t > 25 * 60 && t < 34 * 60, `${t}`);
});

test('자전거 레벨 1: 웜업 4분 → 목표 12분 → 쿨다운 2분 → 스트레칭 2개 = 20분', () => {
  const s = bikeDay(1);
  assert.deepEqual(s.map((x) => [x.kind, x.zone || x.name, x.seconds]), [
    ['ride', 'easy', 240], ['ride', 'target', 720], ['ride', 'cool', 120],
    ['cooldown', '종아리 스트레칭', 60], ['cooldown', '허벅지 앞 스트레칭', 60],
  ]);
  assert.equal(totalSeconds(s), 1200);
  assert.deepEqual(s[1].hr, [105, 120]);
});

test('자전거 레벨 5: 언덕 1분 × 3, 메인 합계 22분, 언덕 앞 구간은 다음이 언덕임을 안다', () => {
  const s = bikeDay(5);
  const main = s.filter((x) => x.zone === 'target' || x.zone === 'hill');
  assert.equal(main.filter((x) => x.zone === 'hill').length, 3);
  assert.equal(totalSeconds(main), 22 * 60);
  s.forEach((x, i) => { if (s[i + 1] && s[i + 1].zone === 'hill') assert.equal(x.nextZone, 'hill'); });
  assert.deepEqual(main.find((x) => x.zone === 'hill').hr, [125, 135]);
  assert.equal(main.filter((x) => x.afterHill).length, 3);
});

test('자전거 가볍게: 메인 ⅔, 언덕 없음, 상한 110', () => {
  const s = bikeDay(7, 'light');
  assert.equal(s.filter((x) => x.zone === 'hill').length, 0);
  const t = s.find((x) => x.zone === 'target');
  assert.equal(t.seconds, 15 * 60);
  assert.deepEqual(t.hr, [105, 110]);
});

test('자전거 날은 어느 레벨이든 30분을 넘지 않는다', () => {
  for (let lv = 1; lv <= 7; lv++) assert.ok(totalSeconds(bikeDay(lv)) <= 30 * 60, `Lv${lv}`);
});

test('스트레칭만 하는 날은 쿨다운 단계만', () => {
  const s = stretchDay();
  assert.ok(s.length >= 3 && s.every((x) => x.kind === 'cooldown'));
});
