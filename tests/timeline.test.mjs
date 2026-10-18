import { test } from 'node:test';
import assert from 'node:assert/strict';
import { strengthDay, bikeDay, stretchDay, totalSeconds, routineSummary } from '../js/timeline.js';
import { initLevels, levelUp } from '../js/levels.js';
import { levelOf } from '../js/program.js';

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

test('횟수 종목은 제한시간을 길이로, 목표 횟수를 target으로 — 세트별 목표면 세트마다 다르게', () => {
  const p = strengthDay(L).filter((x) => x.exId === 'push');
  assert.deepEqual(p.map((w) => [w.type, w.target, w.seconds]), [['reps', 15, 70], ['reps', 10, 50], ['reps', 8, 42]]);
  const light = strengthDay(L, 'light').filter((x) => x.exId === 'push');
  assert.deepEqual(light.map((w) => w.target), [15, 10]);
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

test('자전거 날: 웜업 편하게 2분 → 올리기 3분 → 루틴 → 쿨다운 2분 → 스트레칭 2개', () => {
  const s = bikeDay(1);
  assert.deepEqual(s.slice(0, 2).map((x) => [x.zone, x.seconds]), [['easy', 120], ['build', 180]]);
  assert.deepEqual(s.slice(-3).map((x) => [x.kind, x.zone || x.name, x.seconds]), [
    ['ride', 'cool', 120], ['cooldown', '종아리 스트레칭', 60], ['cooldown', '허벅지 앞 스트레칭', 60],
  ]);
  assert.equal(totalSeconds(s.filter((x) => x.main)), 12 * 60);
  assert.ok(s.filter((x) => x.main).every((x) => x.routine === 'interval'));
});

test('인터벌 Lv1: 세게 1분 × 4, 사이 편하게 2분 — 세게는 심박 125~135', () => {
  const m = bikeDay(1, 'normal', 'interval').filter((x) => x.main);
  assert.deepEqual(m.map((x) => [x.zone, x.seconds]), [['hard', 60], ['recover', 120], ['hard', 60], ['recover', 120], ['hard', 60], ['recover', 120], ['hard', 60], ['recover', 120]]);
  assert.deepEqual(m[0].hr, [125, 135]);
  assert.equal(m[0].name, '세게 1/4');
});

test('피라미드 Lv1: 기본 → +1 → +2 → +1 → 기본, 2분 20초씩 (남는 시간은 마지막에)', () => {
  const m = bikeDay(1, 'normal', 'pyramid').filter((x) => x.main);
  assert.deepEqual(m.map((x) => [x.k, x.dir, x.seconds]), [[0, 'first', 140], [1, 'up', 140], [2, 'up', 140], [1, 'down', 140], [0, 'down', 160]]);
  assert.deepEqual(m[2].hr, [115, 130]);
});

test('빠르게 돌리기 Lv1: 빠르게 30초 × 6, 사이 편하게 1분 30초 — 저항은 그대로', () => {
  const m = bikeDay(1, 'normal', 'speed').filter((x) => x.main);
  assert.equal(m.filter((x) => x.zone === 'fast').length, 6);
  assert.ok(m.filter((x) => x.zone === 'fast').every((x) => x.seconds === 30 && x.res === '그대로'));
  assert.equal(totalSeconds(m), 12 * 60);
});

test('자전거 가볍게: 루틴과 상관없이 꾸준히, 메인 ⅔, 상한 110', () => {
  const s = bikeDay(7, 'light', 'interval');
  const m = s.filter((x) => x.main);
  assert.equal(m.length, 1);
  assert.equal(m[0].routine, 'steady');
  assert.equal(m[0].seconds, Math.round((20 * 2) / 3) * 60);
  assert.deepEqual(m[0].hr, [105, 110]);
});

test('자전거 날은 어느 레벨·루틴이든 30분을 넘지 않고, 심박 안내는 135를 넘지 않는다', () => {
  for (const r of ['interval', 'pyramid', 'speed', 'steady']) for (let lv = 1; lv <= 7; lv++) {
    const s = bikeDay(lv, 'normal', r);
    assert.ok(totalSeconds(s) <= 30 * 60, `${r} Lv${lv}`);
    assert.ok(s.filter((x) => x.kind === 'ride').every((x) => x.hr[1] <= 135), `${r} Lv${lv}`);
    assert.equal(totalSeconds(s.filter((x) => x.main)), levelOf('bike', lv).main * 60, `${r} Lv${lv}`);
  }
});

test('루틴 요약 문구', () => {
  assert.equal(routineSummary('interval', 1), '세게 1분 × 4번 · 사이 편하게 2분');
  assert.equal(routineSummary('pyramid', 1), '저항 기본 → +2 → 기본, 2분 20초씩');
  assert.equal(routineSummary('speed', 1), '빠르게 30초 × 6번 · 사이 편하게 1분 30초');
  assert.equal(routineSummary('steady', 1), '12분 동안 심박 105~120');
});

test('스트레칭만 하는 날은 쿨다운 단계만', () => {
  const s = stretchDay();
  assert.ok(s.length >= 3 && s.every((x) => x.kind === 'cooldown'));
});
