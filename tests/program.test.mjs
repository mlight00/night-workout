import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STRENGTH, BIKE, BIKE_ROUTINES, levelOf, maxLevel, limitSec, targetText, planText, repsFor, WARMUP_STRENGTH, COOLDOWN_STRENGTH, COOLDOWN_BIKE } from '../js/program.js';

test('근력 5종목, 순서는 매달리기 → 팔굽혀펴기 → 스쿼트 → 딥스 → 다리 들기', () => {
  assert.deepEqual(STRENGTH.map((e) => e.id), ['hang', 'push', 'squat', 'dip', 'leg']);
});

test('레벨 사다리 길이: 매달리기 10, 팔굽혀펴기 7, 스쿼트 6, 딥스 8, 다리 들기 7, 자전거 7', () => {
  assert.deepEqual([...STRENGTH, BIKE].map((e) => maxLevel(e.id)), [10, 7, 6, 8, 7, 7]);
});

test('시작 레벨: 데드행 20초, 팔굽혀펴기 15·10·8회, 의자 스쿼트 10회, 딥스 버티기 15초, 무릎 들고 버티기 15초', () => {
  const start = STRENGTH.map((e) => levelOf(e.id, e.start));
  assert.deepEqual(start.map((l) => [l.name, l.type === 'hold' ? l.sec : l.reps]), [
    ['데드행', 20], ['팔굽혀펴기', [15, 10, 8]], ['의자 스쿼트', 10], ['딥스 버티기', 15], ['무릎 들고 버티기', 15],
  ]);
});

test('모든 레벨은 3D 자세와 한 줄 팁을 가진다', () => {
  for (const e of STRENGTH) for (const l of e.levels) {
    assert.ok(l.pose, `${e.id} ${l.name} pose`);
    assert.ok(l.tip, `${e.id} ${l.name} tip`);
  }
});

test('같은 종목 안에서 난이도는 줄지 않는다 (같은 동작이면 숫자가 커진다)', () => {
  for (const e of STRENGTH) e.levels.forEach((l, i) => {
    const p = e.levels[i - 1];
    const size = (x) => x.sec || [].concat(x.reps).reduce((a, b) => a + b, 0);
    if (p && p.pose === l.pose) assert.ok(size(l) > size(p), `${e.id} Lv${i + 1}`);
  });
});

test('levelOf는 범위를 벗어나면 양 끝으로 맞춘다', () => {
  assert.equal(levelOf('hang', 0).sec, 20);
  assert.equal(levelOf('hang', 99).name, '친업');
});

test('횟수 종목 제한시간 = 횟수 × 1회 시간 + 10초', () => {
  assert.equal(limitSec(levelOf('push', 1)), 15 * 4 + 10);
  assert.equal(limitSec(levelOf('push', 1), 3), 8 * 4 + 10);
  assert.equal(limitSec(levelOf('hang', 7)), 3 * 10 + 10);
});

test('자전거: 메인은 20분 이하, 강도 1~4, 피라미드는 +3까지만 (무거운 저항은 혈압을 크게 올린다)', () => {
  for (const l of BIKE.levels) {
    assert.ok(l.main <= 20);
    assert.ok(l.tier >= 1 && l.tier <= 4);
  }
  assert.ok(BIKE_ROUTINES.pyramid.steps.every((st) => Math.max(...st) <= 3 && st[0] === 0 && st.at(-1) === 0));
  for (const r of ['interval', 'speed']) assert.equal(BIKE_ROUTINES[r].cycle.length, 4);
});

test('웜업 3분, 근력 쿨다운 3분, 자전거 스트레칭 2분', () => {
  const sum = (a) => a.reduce((s, x) => s + x.sec, 0);
  assert.equal(sum(WARMUP_STRENGTH), 180);
  assert.equal(sum(COOLDOWN_STRENGTH), 180);
  assert.equal(sum(COOLDOWN_BIKE), 120);
});

test('목표 표시 문구', () => {
  assert.equal(targetText(levelOf('hang', 2)), '25초');
  assert.equal(targetText(levelOf('push', 1)), '15·10·8회');
  assert.equal(planText(levelOf('push', 1)), '15·10·8회');
  assert.equal(planText(levelOf('squat', 1)), '10회 × 3');
  assert.equal(targetText(levelOf('bike', 1)), '12분 · 강도 1');
  assert.equal(targetText(levelOf('bike', 7)), '20분 · 강도 4');
});

test('팔굽혀펴기: 경사(의자) 팔굽혀펴기는 없고, 세트별 목표 횟수', () => {
  const push = STRENGTH.find((e) => e.id === 'push');
  assert.ok(push.levels.every((l) => l.pose === 'pushup' && Array.isArray(l.reps) && l.reps.length === 3));
  assert.deepEqual([1, 2, 3].map((n) => repsFor(levelOf('push', 1), n)), [15, 10, 8]);
  assert.equal(repsFor(levelOf('push', 1), 4), 8); // 세트가 더 많으면 마지막 목표
  assert.equal(repsFor(levelOf('squat', 1), 2), 10);
});

test('근력 날 웜업에 자전거가 없다 (제자리 걷기로)', () => {
  assert.ok(!WARMUP_STRENGTH.some((x) => x.pose === 'bike' || /자전거/.test(x.name)));
  assert.ok(WARMUP_STRENGTH.some((x) => x.pose === 'march'));
});
