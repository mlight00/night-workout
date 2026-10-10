import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lineFor, secText, announceNext, QUIET_SEC } from '../js/coach.js';
import { strengthDay, bikeDay } from '../js/timeline.js';
import { createTimer } from '../js/timer.js';
import { initLevels } from '../js/levels.js';

const S = strengthDay(initLevels().levels);
const work = S.find((x) => x.kind === 'work');
const rest = S.find((x) => x.kind === 'rest' && !x.prep);

test('시간 읽기', () => {
  assert.equal(secText(45), '45초');
  assert.equal(secText(60), '1분');
  assert.equal(secText(100), '1분 40초');
});

test('운동 단계 시작에는 말하지 않는다 — 시작 신호는 비프음', () => {
  assert.equal(lineFor({ type: 'stepStart', step: work }), null);
});

test('휴식 시작: 완료 + 휴식 시간, 매달리기 뒤엔 발판 안내가 먼저', () => {
  const r = S.find((x, i) => x.kind === 'rest' && S[i - 1] && S[i - 1].exId === 'hang');
  assert.equal(lineFor({ type: 'stepStart', step: r }), '발판 딛고 천천히 내려오세요. 완료. 1분 휴식');
});

test('준비 단계: 무엇을 시작하는지 말한다', () => {
  assert.equal(lineFor({ type: 'stepStart', step: S[3] }), '준비. 20초 뒤 데드행 시작합니다');
});

test('휴식 15초 전에 다음 운동을 미리 안내한다', () => {
  assert.equal(lineFor({ type: 'second', step: rest, remaining: 15 }), announceNext(rest.next));
  assert.match(announceNext(rest.next), /^다음은 데드행, 두 번째 세트\. 20초 버티기$/);
});

test('딥스 안내에는 "팔꿈치 90도까지만"이 붙는다', () => {
  const d = S.find((x) => x.exId === 'dip');
  assert.match(announceNext(d), /팔꿈치 90도까지만$/);
});

test('버티기 중: 5초 지나면 숨 안내, 10초 남으면 "10초"', () => {
  assert.equal(lineFor({ type: 'second', step: work, remaining: 15 }), '숨 참지 마세요');
  assert.equal(lineFor({ type: 'second', step: work, remaining: 10 }), '10초');
});

test('횟수 종목 첫 세트에만 탭 안내', () => {
  const p = S.filter((x) => x.exId === 'push');
  assert.equal(lineFor({ type: 'second', step: p[0], remaining: p[0].seconds - 4 }), '다 하면 화면을 탭하세요');
  assert.equal(lineFor({ type: 'second', step: p[1], remaining: p[1].seconds - 4 }), null);
});

test('6초 규칙: 실제 루틴 전체에서 끝나기 6초 전 이후의 말은 하나도 없다', () => {
  for (const steps of [S, bikeDay(5)]) {
    const t = createTimer(steps);
    let bad = 0;
    for (const e of t.start(0)) if (e.type === 'second' && e.remaining < QUIET_SEC && lineFor(e)) bad++;
    for (let ms = 100; ms < 40 * 60 * 1000; ms += 100) for (const e of t.tick(ms)) {
      if (e.type === 'second' && e.remaining < QUIET_SEC && lineFor(e)) bad++;
    }
    assert.equal(bad, 0);
  }
});

test('자전거: 웜업·목표·언덕·쿨다운 안내', () => {
  const b = bikeDay(5);
  assert.equal(lineFor({ type: 'stepStart', step: b[0] }), '웜업 4분. 저항은 낮게, 심박 100 이하');
  assert.equal(lineFor({ type: 'stepStart', step: b[1] }), '목표 구간. 심박 105에서 120');
  const hill = b.find((x) => x.zone === 'hill');
  assert.equal(lineFor({ type: 'stepStart', step: hill }), '언덕 구간 1분. 심박 135을 넘지 않게');
  const after = b.find((x) => x.afterHill);
  assert.match(lineFor({ type: 'stepStart', step: after }), /^저항을 내리세요/);
  assert.equal(lineFor({ type: 'second', step: b[1], remaining: 10 }), '10초 뒤 언덕 구간. 저항을 두 단계 올리세요');
  assert.equal(lineFor({ type: 'stepStart', step: b.find((x) => x.zone === 'cool') }), '쿨다운. 저항을 가장 낮게, 천천히 돌리세요');
});

test('자전거 목표 구간: 5분마다 심박 확인', () => {
  const t = bikeDay(4)[1];
  assert.equal(lineFor({ type: 'second', step: t, remaining: t.seconds - 300 }), '심박 확인. 목표 105에서 120');
  assert.equal(lineFor({ type: 'second', step: t, remaining: t.seconds - 299 }), null);
});

test('세션 끝 인사', () => {
  assert.equal(lineFor({ type: 'sessionEnd' }), '오늘 운동 끝났습니다. 참 잘하셨어요');
});
