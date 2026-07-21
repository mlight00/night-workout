import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTimer } from '../js/timer.js';
import { ROUTINE } from '../js/routine.js';
import { buildTimeline } from '../js/timeline.js';

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

test('실제 25분 루틴을 끝까지 흘리면 42단계가 순서대로 다 지나간다', () => {
  const steps = buildTimeline(ROUTINE);
  const t = createTimer(steps);
  const seen = [];
  const collect = (evs) => evs.forEach((e) => { if (e.type === 'stepStart') seen.push(e.index); });

  collect(t.start(0));
  for (let ms = 100; ms <= 1521_000 + 1000; ms += 100) collect(t.tick(ms));

  assert.equal(seen.length, 42);
  assert.deepEqual(seen, steps.map((_, i) => i));
  assert.equal(t.state().finished, true);
});

test('실제 루틴에서 second 이벤트는 정확히 1479회 (1521초 - 42단계)', () => {
  const steps = buildTimeline(ROUTINE);
  const t = createTimer(steps);
  let seconds = 0;
  const collect = (evs) => { seconds += evs.filter((e) => e.type === 'second').length; };

  collect(t.start(0));
  for (let ms = 100; ms <= 1521_000 + 1000; ms += 100) collect(t.tick(ms));

  // 각 단계는 남은 초가 N-1 → 1까지 알린다 (0은 stepEnd가 대신하므로) = seconds-1번
  assert.equal(seconds, 1479);
  assert.equal(steps.reduce((sum, s) => sum + (s.seconds - 1), 0), 1479);
});

test('불규칙한 프레임 간격(30~120ms)에서도 결과가 똑같다', () => {
  // 실제 폰에서는 requestAnimationFrame 간격이 일정하지 않다.
  // 이벤트가 빠지거나 중복되면 음성이 씹히거나 두 번 나온다.
  const steps = buildTimeline(ROUTINE);
  const t = createTimer(steps);
  let seconds = 0, starts = 0;
  const collect = (evs) => {
    seconds += evs.filter((e) => e.type === 'second').length;
    starts += evs.filter((e) => e.type === 'stepStart').length;
  };

  collect(t.start(0));
  let ms = 0, i = 0;
  while (ms <= 1521_000 + 2000) { ms += 30 + ((i++ * 37) % 90); collect(t.tick(ms)); }

  assert.equal(seconds, 1479);
  assert.equal(starts, 42);
});
