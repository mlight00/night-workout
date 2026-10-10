import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STRENGTH, BIKE, levelOf, maxLevel, limitSec, targetText, WARMUP_STRENGTH, COOLDOWN_STRENGTH, COOLDOWN_BIKE } from '../js/program.js';

test('근력 5종목, 순서는 매달리기 → 팔굽혀펴기 → 스쿼트 → 딥스 → 다리 들기', () => {
  assert.deepEqual(STRENGTH.map((e) => e.id), ['hang', 'push', 'squat', 'dip', 'leg']);
});

test('레벨 사다리 길이: 매달리기 10, 팔굽혀펴기 7, 스쿼트 6, 딥스 8, 다리 들기 7, 자전거 7', () => {
  assert.deepEqual([...STRENGTH, BIKE].map((e) => maxLevel(e.id)), [10, 7, 6, 8, 7, 7]);
});

test('시작 레벨: 데드행 20초, 바닥 팔굽혀펴기 8회, 의자 스쿼트 10회, 딥스 버티기 15초, 무릎 들고 버티기 15초', () => {
  const start = STRENGTH.map((e) => levelOf(e.id, e.start));
  assert.deepEqual(start.map((l) => [l.name, l.type === 'hold' ? l.sec : l.reps]), [
    ['데드행', 20], ['팔굽혀펴기', 8], ['의자 스쿼트', 10], ['딥스 버티기', 15], ['무릎 들고 버티기', 15],
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
    if (p && p.pose === l.pose) assert.ok((l.sec || l.reps) > (p.sec || p.reps), `${e.id} Lv${i + 1}`);
  });
});

test('levelOf는 범위를 벗어나면 양 끝으로 맞춘다', () => {
  assert.equal(levelOf('hang', 0).sec, 20);
  assert.equal(levelOf('hang', 99).name, '친업');
});

test('횟수 종목 제한시간 = 횟수 × 1회 시간 + 10초', () => {
  assert.equal(limitSec(levelOf('push', 3)), 8 * 4 + 10);
  assert.equal(limitSec(levelOf('hang', 7)), 3 * 10 + 10);
});

test('자전거: 메인은 30분을 넘지 않고, 언덕 구간이 메인보다 짧다', () => {
  for (const l of BIKE.levels) {
    assert.ok(l.main <= 22);
    assert.ok(l.hills * l.hillSec < l.main * 60 / 2);
  }
});

test('웜업 3분, 근력 쿨다운 3분, 자전거 스트레칭 2분', () => {
  const sum = (a) => a.reduce((s, x) => s + x.sec, 0);
  assert.equal(sum(WARMUP_STRENGTH), 180);
  assert.equal(sum(COOLDOWN_STRENGTH), 180);
  assert.equal(sum(COOLDOWN_BIKE), 120);
});

test('목표 표시 문구', () => {
  assert.equal(targetText(levelOf('hang', 2)), '25초');
  assert.equal(targetText(levelOf('push', 3)), '8회');
  assert.equal(targetText(levelOf('bike', 1)), '12분');
  assert.equal(targetText(levelOf('bike', 7)), '22분 · 언덕 2분×4');
});
