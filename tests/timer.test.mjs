import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTimer } from '../js/timer.js';
import { strengthDay, bikeDay, totalSeconds } from '../js/timeline.js';
import { initLevels } from '../js/levels.js';
const REAL = [strengthDay(initLevels().levels), bikeDay(7)];

// 테스트용 짧은 단계 목록
const STEPS = [
  { kind: 'warmup', name: '어깨 회전', seconds: 3 },
  { kind: 'ready', name: '데드행', seconds: 2, exerciseId: 'deadhang', setNo: 1, totalSets: 3 },
  { kind: 'work', name: '데드행', seconds: 4, exerciseId: 'deadhang', type: 'hold', setNo: 1, totalSets: 3 },
];

const types = (events) => events.map((e) => e.type);

test('start하면 첫 단계 시작 이벤트가 나온다', () => {
  const t = createTimer(STEPS);
  const ev = t.start(1000);
  assert.deepEqual(types(ev), ['stepStart']);
  assert.equal(ev[0].index, 0);
  assert.equal(ev[0].step.name, '어깨 회전');
});

test('진행 중 상태를 물어볼 수 있다', () => {
  const t = createTimer(STEPS);
  t.start(1000);
  t.tick(2500);
  const s = t.state();
  assert.equal(s.index, 0);
  assert.equal(s.remaining, 1.5);
  assert.equal(s.elapsed, 1.5);
  assert.equal(s.finished, false);
});

test('남은 초가 정수로 바뀔 때마다 second 이벤트가 한 번씩', () => {
  const t = createTimer(STEPS);
  t.start(0);
  assert.deepEqual(t.tick(100).map((e) => e.remaining), [], '아직 3초 그대로면 없음');
  assert.deepEqual(t.tick(1100).map((e) => e.remaining), [2]);
  assert.deepEqual(t.tick(1900).map((e) => e.remaining), [], '같은 2초 구간은 다시 안 나옴');
  assert.deepEqual(t.tick(2100).map((e) => e.remaining), [1]);
});

test('한 번의 tick에서 여러 초가 지나가도 빠짐없이 나온다 (화면이 잠깐 멈춘 경우)', () => {
  const t = createTimer(STEPS);
  t.start(0);
  const ev = t.tick(2900);
  assert.deepEqual(ev.filter((e) => e.type === 'second').map((e) => e.remaining), [2, 1]);
});

test('시간이 다 되면 stepEnd + 다음 stepStart가 이어서 나온다', () => {
  const t = createTimer(STEPS);
  t.start(0);
  const ev = t.tick(3000);
  const end = ev.find((e) => e.type === 'stepEnd');
  const next = ev.find((e) => e.type === 'stepStart');
  assert.equal(end.index, 0);
  assert.equal(end.reason, 'timeout');
  assert.equal(end.actualSeconds, 3);
  assert.equal(next.index, 1);
  assert.equal(next.step.name, '데드행');
});

test('한 번의 tick으로 여러 단계를 건너뛰어도 순서대로 다 나온다', () => {
  const t = createTimer(STEPS);
  t.start(0);
  const ev = t.tick(6000); // 3초 + 2초 지남 → 3번째 단계 진행 중
  const flow = ev.filter((e) => e.type !== 'second').map((e) => [e.type, e.index]);
  assert.deepEqual(flow, [
    ['stepEnd', 0], ['stepStart', 1],
    ['stepEnd', 1], ['stepStart', 2],
  ]);
  assert.equal(t.state().index, 2);
});

test('skip하면 다음 tick에서 현재 단계가 즉시 끝난다', () => {
  const t = createTimer(STEPS);
  t.start(0);
  t.tick(1000);
  t.skip();
  const ev = t.tick(1000);
  const end = ev.find((e) => e.type === 'stepEnd');
  assert.equal(end.reason, 'skip');
  assert.equal(end.actualSeconds, 1);
  assert.equal(t.state().index, 1);
});

test('마지막 단계가 끝나면 sessionEnd가 나오고 finished가 된다', () => {
  const t = createTimer(STEPS);
  t.start(0);
  const ev = t.tick(99999);
  assert.equal(types(ev).at(-1), 'sessionEnd');
  assert.equal(t.state().finished, true);
});

test('끝난 뒤 tick을 더 해도 아무 이벤트도 안 나온다', () => {
  const t = createTimer(STEPS);
  t.start(0);
  t.tick(99999);
  assert.deepEqual(t.tick(999999), []);
});

test('전체 경과 시간을 알려준다 (진행바용)', () => {
  const t = createTimer(STEPS);
  t.start(1000);
  t.tick(6000);
  assert.equal(t.state().totalElapsed, 5);
  assert.equal(t.state().totalSeconds, 9);
});

test('skip으로 단계를 일찍 끝내면 전체 경과도 그만큼 줄어든다', () => {
  const t = createTimer(STEPS);
  t.start(0);
  t.tick(1000);
  t.skip();
  t.tick(1000);   // 0번 단계를 1초에 끝냄
  t.tick(2000);   // 1번 단계 1초 진행
  assert.equal(t.state().totalElapsed, 2);
});

for (const [k, steps] of REAL.entries()) {
  const total = totalSeconds(steps), expect = steps.reduce((a, s) => a + (s.seconds - 1), 0);

  test(`실제 루틴 ${k}: 모든 단계가 순서대로 지나간다`, () => {
    const t = createTimer(steps), seen = [];
    const collect = (evs) => evs.forEach((e) => { if (e.type === 'stepStart') seen.push(e.index); });
    collect(t.start(0));
    for (let ms = 100; ms <= total * 1000 + 1000; ms += 100) collect(t.tick(ms));
    assert.deepEqual(seen, steps.map((_, i) => i));
    assert.equal(t.state().finished, true);
  });

  test(`실제 루틴 ${k}: 불규칙한 프레임에서도 second 이벤트가 빠지지도 겹치지도 않는다`, () => {
    const t = createTimer(steps);
    let n = 0, starts = 0;
    const collect = (evs) => { n += evs.filter((e) => e.type === 'second').length; starts += evs.filter((e) => e.type === 'stepStart').length; };
    collect(t.start(0));
    let ms = 0, i = 0;
    while (ms <= total * 1000 + 2000) { ms += 30 + ((i++ * 37) % 170); collect(t.tick(ms)); }
    assert.equal(n, expect);
    assert.equal(starts, steps.length);
  });
}

test('일시정지: shift한 만큼 현재 단계가 늦게 끝난다', () => {
  const t = createTimer(STEPS);
  t.start(0);
  t.tick(1000);
  t.shift(5000); // 5초 멈춰 있었다
  assert.deepEqual(t.tick(6000).filter((e) => e.type === 'stepEnd'), []);
  assert.equal(t.state().index, 0);
  assert.equal(t.state().remaining, 2);
  assert.equal(t.tick(8000).find((e) => e.type === 'stepEnd').index, 0);
});
