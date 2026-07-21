import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lineFor, createCoach } from '../js/coach.js';

const step = (over) => ({ kind: 'work', name: '데드행', seconds: 25, exerciseId: 'deadhang', type: 'hold', setNo: 2, totalSets: 3, ...over });

test('웜업 단계 시작 — 항목 이름을 말한다', () => {
  assert.equal(
    lineFor({ type: 'stepStart', step: { kind: 'warmup', name: '어깨 회전', seconds: 40 } }),
    '어깨 회전, 40초'
  );
});

test('준비 단계 시작 — 종목과 몇 번째 세트인지 말한다', () => {
  assert.equal(
    lineFor({ type: 'stepStart', step: step({ kind: 'ready', seconds: 3 }) }),
    '데드행, 두 번째 세트. 준비'
  );
});

test('세트 번호는 한글로 읽는다', () => {
  const s = (n) => lineFor({ type: 'stepStart', step: step({ kind: 'ready', setNo: n }) });
  assert.match(s(1), /첫 번째 세트/);
  assert.match(s(2), /두 번째 세트/);
  assert.match(s(3), /세 번째 세트/);
});

test('버티기 시작 — 목표 시간을 말한다', () => {
  assert.equal(lineFor({ type: 'stepStart', step: step() }), '시작. 25초 버티세요');
});

test('팔굽혀펴기 시작 — 횟수와 탭 안내를 말한다 (1단계에는 AI가 없으므로)', () => {
  const w = step({ name: '팔굽혀펴기', exerciseId: 'pushup', type: 'reps', reps: 12, seconds: 60 });
  assert.equal(lineFor({ type: 'stepStart', step: w }), '시작. 12회. 다 하시면 화면을 탭하세요');
});

test('휴식 시작 — 쉬는 시간과 다음 종목을 말한다', () => {
  const r = { kind: 'rest', name: '휴식', seconds: 90, nextName: '딥스 버티기' };
  assert.equal(lineFor({ type: 'stepStart', step: r }), '완료. 90초 휴식. 다음은 딥스 버티기');
});

test('쿨다운 단계 시작', () => {
  assert.equal(
    lineFor({ type: 'stepStart', step: { kind: 'cooldown', name: '가슴 스트레칭', seconds: 60 } }),
    '가슴 스트레칭, 60초'
  );
});

test('준비 카운트다운은 숫자만 읽는다', () => {
  const s = step({ kind: 'ready' });
  assert.equal(lineFor({ type: 'second', step: s, remaining: 2 }), '둘');
  assert.equal(lineFor({ type: 'second', step: s, remaining: 1 }), '하나');
});

test('버티기 중에는 10초와 5초에만 말한다', () => {
  const s = step();
  assert.equal(lineFor({ type: 'second', step: s, remaining: 10 }), '10초 남았습니다');
  assert.equal(lineFor({ type: 'second', step: s, remaining: 5 }), '좋습니다, 5초');
  assert.equal(lineFor({ type: 'second', step: s, remaining: 7 }), null, '나머지는 조용히');
  assert.equal(lineFor({ type: 'second', step: s, remaining: 20 }), null);
});

test('휴식 끝 10초 전에는 자리로 오라고 말한다', () => {
  const r = { kind: 'rest', name: '휴식', seconds: 60, nextName: '데드행' };
  assert.equal(lineFor({ type: 'second', step: r, remaining: 10 }), '10초 뒤 시작합니다. 자리로 오세요');
  assert.equal(lineFor({ type: 'second', step: r, remaining: 30 }), null);
});

test('웜업·쿨다운 중에는 남은 시간을 말하지 않는다', () => {
  const w = { kind: 'warmup', name: '어깨 회전', seconds: 40 };
  assert.equal(lineFor({ type: 'second', step: w, remaining: 10 }), null);
  assert.equal(lineFor({ type: 'second', step: w, remaining: 5 }), null);
});

test('세션이 끝나면 마무리 인사', () => {
  assert.equal(lineFor({ type: 'sessionEnd' }), '오늘 운동 끝났습니다. 참 잘하셨어요');
});

test('stepEnd에는 아무 말도 안 한다 — 다음 단계 시작 문구와 겹치므로', () => {
  assert.equal(lineFor({ type: 'stepEnd', step: step(), actualSeconds: 25, reason: 'timeout' }), null);
});

test('createCoach는 문구가 있는 이벤트만 speak으로 넘긴다', () => {
  const said = [];
  const coach = createCoach((text) => said.push(text));
  coach.handle({ type: 'stepStart', step: { kind: 'warmup', name: '어깨 회전', seconds: 40 } });
  coach.handle({ type: 'second', step: step(), remaining: 7 }); // 조용한 이벤트
  coach.handle({ type: 'sessionEnd' });
  assert.deepEqual(said, ['어깨 회전, 40초', '오늘 운동 끝났습니다. 참 잘하셨어요']);
});
