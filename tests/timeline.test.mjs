import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROUTINE } from '../js/routine.js';
import { buildTimeline, totalSeconds } from '../js/timeline.js';

const steps = buildTimeline(ROUTINE);

test('전체 42단계로 펼쳐진다', () => {
  assert.equal(steps.length, 42);
});

test('전체 길이는 1521초 (최악 기준 25분 21초)', () => {
  assert.equal(totalSeconds(steps), 1521);
});

test('맨 앞 4단계는 웜업', () => {
  assert.deepEqual(
    steps.slice(0, 4).map((s) => [s.kind, s.name, s.seconds]),
    [
      ['warmup', '어깨 회전', 40],
      ['warmup', '팔목·발목 돌리기', 40],
      ['warmup', '제자리 걷기', 50],
      ['warmup', '맨몸 스쿼트 10회', 50],
    ]
  );
});

test('맨 뒤 3단계는 쿨다운', () => {
  assert.deepEqual(
    steps.slice(-3).map((s) => [s.kind, s.name]),
    [['cooldown', '가슴 스트레칭'], ['cooldown', '광배근 스트레칭'], ['cooldown', '어깨 후면 스트레칭']]
  );
});

test('메인 첫 세트는 준비 3초 → 데드행 25초 → 휴식 60초 순서', () => {
  assert.deepEqual(
    steps.slice(4, 7).map((s) => [s.kind, s.seconds]),
    [['ready', 3], ['work', 25], ['rest', 60]]
  );
  assert.equal(steps[5].exerciseId, 'deadhang');
  assert.equal(steps[5].setNo, 1);
  assert.equal(steps[5].totalSets, 3);
});

test('팔굽혀펴기 work 단계는 제한시간 60초를 길이로 쓰고 목표 횟수를 들고 있다', () => {
  const w = steps.find((s) => s.kind === 'work' && s.exerciseId === 'pushup');
  assert.equal(w.seconds, 60);
  assert.equal(w.type, 'reps');
  assert.equal(w.reps, 12);
});

test('팔굽혀펴기 휴식은 90초', () => {
  const r = steps.find((s) => s.kind === 'rest' && s.exerciseId === 'pushup');
  assert.equal(r.seconds, 90);
});

test('마지막 종목의 마지막 세트 뒤에는 휴식이 없고 바로 쿨다운으로 간다', () => {
  const lastWorkIdx = steps.findLastIndex((s) => s.kind === 'work');
  assert.equal(steps[lastWorkIdx].exerciseId, 'legraise');
  assert.equal(steps[lastWorkIdx].setNo, 3);
  assert.equal(steps[lastWorkIdx + 1].kind, 'cooldown');
});

test('그 외의 모든 work 뒤에는 휴식이 온다', () => {
  const lastWorkIdx = steps.findLastIndex((s) => s.kind === 'work');
  steps.forEach((s, i) => {
    if (s.kind === 'work' && i !== lastWorkIdx) {
      assert.equal(steps[i + 1].kind, 'rest', `${i}번 work 뒤`);
    }
  });
});

test('휴식 단계는 다음에 무엇이 오는지 알려준다', () => {
  const firstRest = steps.find((s) => s.kind === 'rest');
  assert.equal(firstRest.nextName, '데드행');
  // 종목의 마지막 휴식은 다음 종목 이름을 가리킨다
  const deadhangRests = steps.filter((s) => s.kind === 'rest' && s.exerciseId === 'deadhang');
  assert.equal(deadhangRests.at(-1).nextName, '팔굽혀펴기');
});

test('종목별 세트 수는 정확히 3개씩', () => {
  for (const id of ['deadhang', 'pushup', 'dips', 'legraise']) {
    const works = steps.filter((s) => s.kind === 'work' && s.exerciseId === id);
    assert.equal(works.length, 3, id);
    assert.deepEqual(works.map((w) => w.setNo), [1, 2, 3], id);
  }
});
