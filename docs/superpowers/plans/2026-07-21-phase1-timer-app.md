# 1단계: 타이머 앱 (AI 없음) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 25분 야간 운동 루틴을 음성으로 자동 진행시키는, 카메라 없이도 완결적으로 동작하는 PWA를 만든다.

**Architecture:** 순수 ES 모듈. `routine.js`(데이터) → `timeline.js`(평탄한 단계 목록으로 전개) → `timer.js`(시각을 주입받아 이벤트를 뱉는 순수 엔진) → `coach.js`/`ui.js`(이벤트를 음성·화면으로 변환) 순으로 흐른다. 핵심 로직은 DOM·타이머 API·브라우저를 전혀 모르므로 `node --test`로 전부 검증할 수 있다. `app.js`만이 조각들을 알고 조립한다.

**Tech Stack:** 순수 HTML/CSS/JavaScript (ES Modules), 빌드 도구 없음. 테스트는 Node 22 내장 `node --test`. 브라우저 API는 `speechSynthesis`(음성), Screen Wake Lock(화면 유지), `localStorage`(기록). 배포는 GitHub Pages.

**테스트 실행 명령 (Windows 주의):** 전체를 돌릴 때는 프로젝트 루트에서 **인자 없이 `node --test`** 를 쓴다. `node --test tests/`는 Windows에서 디렉터리를 테스트 파일로 착각해 실패한다 (확인 완료). 파일 하나만 돌릴 때는 `node --test tests/파일명.test.mjs`가 정상 동작한다.

**검증 완료 사항:** `js/timeline.js`와 `js/timer.js`의 핵심 로직은 이 계획을 쓰면서 실제로 작성해 돌려봤다. 42단계 / 1521초 / second 이벤트 1479회 / 불규칙 프레임(30~120ms)에서도 동일이 모두 확인되었다. 아래 코드와 기대값은 추정이 아니라 실측이다.

**참조 설계 문서:** `docs/superpowers/specs/2026-07-21-night-workout-design.md`

**기존 프로젝트 관례:** `C:\workspace\neon-fleet`와 동일한 스타일을 따른다 — `js/*.js`는 named export하는 ES 모듈, `index.html`은 `<script type="module" src="js/app.js">` 하나만 로드, 테스트는 `tests/*.test.mjs`에서 `node:test` + `node:assert/strict` 사용, 테스트 이름과 코드 주석은 한글.

---

## 1단계에 포함되는 것 / 제외되는 것

**포함:** 25분 자동 진행, 음성 코칭, 화면 탭으로 수동 진행, 화면 꺼짐 방지, 기록 저장, 홈 화면 아이콘(PWA), 화면 3개(홈/운동/완료)

**제외 (2·3단계로 미룸):** 카메라, AI 판정, 자리 잡기, 성장 그래프, 달력, 연속일수, 「AI 끄기」 토글

1단계 홈 화면은 **시작 버튼 + 마지막 운동 한 줄 요약**만 있으면 된다. 운동 화면 배경은 카메라 대신 검은 화면이다.

## 1단계에서 확정한 두 가지 규칙

설계 문서에는 없던 것으로, 이 계획에서 확정한다.

**① 팔굽혀펴기 세트를 어떻게 끝낼 것인가**

1단계에는 AI가 없어서 횟수를 셀 수 없다. 그래서 팔굽혀펴기 work 단계는 **제한시간 60초로 돌리되, 음성이 "다 하시면 화면을 탭하세요"라고 안내**한다. 탭하면 즉시 휴식으로 넘어가고, 안 탭하면 60초 뒤 자동으로 넘어간다. 기록에는 실제 걸린 시간이 남고 횟수는 `null`(미측정)로 남는다. 2단계에서 AI가 붙으면 횟수가 채워진다.

**② 마지막 종목의 마지막 휴식은 없앤다**

세트 뒤에는 항상 휴식이 붙지만, **맨 마지막 종목(다리 들고 버티기)의 마지막 세트 뒤에는 휴식 없이 바로 쿨다운**으로 넘어간다. 안 그러면 아무것도 안 하는 60초가 끝에 붙는다.

이 두 규칙을 반영한 전체 길이는 다음과 같다.

| | 계산 | 초 |
|---|---|---|
| 웜업 | 40+40+50+50 | 180 |
| 데드행 | (3+25+60)×3 | 264 |
| 팔굽혀펴기 | (3+60+90)×3 | 459 |
| 딥스 | (3+20+60)×3 | 249 |
| 다리 들기 | (3+20+60)×2 + (3+20) | 189 |
| 쿨다운 | 60×3 | 180 |
| **합계 (최악)** | | **1521초 = 25분 21초** |

팔굽혀펴기를 30초쯤에 탭하면 실제로는 **약 23분 51초**로 끝난다. 이 두 숫자가 테스트의 기준값이 된다.

---

## 파일 구조

| 파일 | 책임 | 테스트 |
|---|---|---|
| `js/routine.js` | 운동 프로그램 데이터. 루틴 변경은 여기만 | O |
| `js/timeline.js` | 루틴을 42개의 평탄한 단계 목록으로 전개 | O |
| `js/format.js` | 초 → `MM:SS` 문자열 | O |
| `js/timer.js` | 시각을 주입받아 단계 진행 이벤트를 뱉는 엔진 | O |
| `js/coach.js` | 이벤트 → 음성 문구. `speak` 주입식 | O |
| `js/storage.js` | 기록 조립 + 저장/불러오기. `storage` 주입식 | O |
| `js/wakelock.js` | 화면 꺼짐 방지 (브라우저 API 래퍼) | X |
| `js/ui.js` | DOM 갱신 | X |
| `js/app.js` | 조각 조립 + 화면 전환 + 애니메이션 루프 | X |
| `index.html` | 화면 3개의 뼈대 | X |
| `css/style.css` | 스타일 | X |
| `manifest.json` | 홈 화면 아이콘 설정 | X |
| `tools/make_icons.py` | 아이콘 PNG 생성 (1회성) | X |

**경계 원칙:** `routine`/`timeline`/`format`/`timer`/`coach`/`storage`는 DOM·브라우저 API를 import하지 않는다. 브라우저를 아는 것은 `wakelock`/`ui`/`app` 셋뿐이다.

---

## Task 1: 운동 프로그램 데이터

**Files:**
- Create: `js/routine.js`
- Test: `tests/routine.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
// tests/routine.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROUTINE } from '../js/routine.js';

test('웜업은 4개 항목, 합 180초', () => {
  assert.equal(ROUTINE.warmup.length, 4);
  assert.equal(ROUTINE.warmup.reduce((s, x) => s + x.seconds, 0), 180);
});

test('쿨다운은 3개 항목, 합 180초', () => {
  assert.equal(ROUTINE.cooldown.length, 3);
  assert.equal(ROUTINE.cooldown.reduce((s, x) => s + x.seconds, 0), 180);
});

test('메인은 4종목, 순서는 데드행 → 팔굽혀펴기 → 딥스 → 다리들기', () => {
  assert.deepEqual(ROUTINE.main.map((e) => e.id), ['deadhang', 'pushup', 'dips', 'legraise']);
});

test('모든 메인 종목은 3세트', () => {
  for (const e of ROUTINE.main) assert.equal(e.sets, 3, `${e.id} 세트 수`);
});

test('버티기 종목은 seconds, 팔굽혀펴기만 reps + limitSeconds', () => {
  const byId = Object.fromEntries(ROUTINE.main.map((e) => [e.id, e]));
  assert.equal(byId.deadhang.type, 'hold');
  assert.equal(byId.deadhang.seconds, 25);
  assert.equal(byId.dips.seconds, 20);
  assert.equal(byId.legraise.seconds, 20);
  assert.equal(byId.pushup.type, 'reps');
  assert.equal(byId.pushup.reps, 12);
  assert.equal(byId.pushup.limitSeconds, 60);
  assert.equal(byId.pushup.seconds, undefined, 'reps 종목에 seconds가 있으면 안 됨');
});

test('휴식은 팔굽혀펴기만 90초, 나머지는 60초', () => {
  const byId = Object.fromEntries(ROUTINE.main.map((e) => [e.id, e]));
  assert.equal(byId.pushup.restSeconds, 90);
  assert.equal(byId.deadhang.restSeconds, 60);
  assert.equal(byId.dips.restSeconds, 60);
  assert.equal(byId.legraise.restSeconds, 60);
});

test('세트 전 준비 카운트다운은 3초', () => {
  assert.equal(ROUTINE.readySeconds, 3);
});
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인**

```
node --test tests/routine.test.mjs
```

기대: `Cannot find module .../js/routine.js` 로 전부 실패.

- [ ] **Step 3: 최소 구현 작성**

```js
// js/routine.js
// 운동 프로그램 정의 — 루틴을 바꾸려면 이 파일의 숫자만 고치면 된다.
// type 'hold' = 시간 버티기, type 'reps' = 횟수 반복(limitSeconds는 안전 상한)

export const ROUTINE = {
  readySeconds: 3, // 세트 시작 전 "준비" 카운트다운

  warmup: [
    { name: '어깨 회전', seconds: 40 },
    { name: '팔목·발목 돌리기', seconds: 40 },
    { name: '제자리 걷기', seconds: 50 },
    { name: '맨몸 스쿼트 10회', seconds: 50 },
  ],

  main: [
    { id: 'deadhang', name: '데드행', type: 'hold', seconds: 25, sets: 3, restSeconds: 60 },
    { id: 'pushup', name: '팔굽혀펴기', type: 'reps', reps: 12, limitSeconds: 60, sets: 3, restSeconds: 90 },
    { id: 'dips', name: '딥스 버티기', type: 'hold', seconds: 20, sets: 3, restSeconds: 60 },
    { id: 'legraise', name: '다리 들고 버티기', type: 'hold', seconds: 20, sets: 3, restSeconds: 60 },
  ],

  cooldown: [
    { name: '가슴 스트레칭', seconds: 60 },
    { name: '광배근 스트레칭', seconds: 60 },
    { name: '어깨 후면 스트레칭', seconds: 60 },
  ],
};
```

- [ ] **Step 4: 테스트 통과 확인**

```
node --test tests/routine.test.mjs
```

기대: `# pass 7`, `# fail 0`

- [ ] **Step 5: 커밋**

```bash
git add js/routine.js tests/routine.test.mjs
git commit -m "feat: 운동 프로그램 데이터 정의"
```

---

## Task 2: 타임라인 전개

루틴을 "앞에서부터 순서대로 실행하면 되는" 평탄한 단계 목록으로 펼친다.

**단계(step)의 형태 — 이후 모든 태스크가 이 모양에 의존한다:**

```js
{ kind: 'warmup'|'ready'|'work'|'rest'|'cooldown',
  name: '데드행',          // 화면·음성에 쓰는 이름
  seconds: 25,             // 이 단계의 길이
  exerciseId: 'deadhang',  // work/ready/rest만. warmup/cooldown은 없음
  type: 'hold'|'reps',     // work만
  reps: 12,                // work + type 'reps'만
  setNo: 1, totalSets: 3,  // ready/work/rest만
  nextName: '데드행' }     // rest만. "다음: 데드행"에 씀
```

**Files:**
- Create: `js/timeline.js`
- Test: `tests/timeline.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
// tests/timeline.test.mjs
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
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인**

```
node --test tests/timeline.test.mjs
```

기대: `Cannot find module .../js/timeline.js`

- [ ] **Step 3: 최소 구현 작성**

```js
// js/timeline.js
// 루틴 정의를 "앞에서부터 순서대로 실행하면 되는" 평탄한 단계 목록으로 펼친다.
// 순수 함수 — DOM도 시간도 모른다.

export function buildTimeline(routine) {
  const steps = [];

  for (const w of routine.warmup) {
    steps.push({ kind: 'warmup', name: w.name, seconds: w.seconds });
  }

  routine.main.forEach((ex, exIdx) => {
    const isLastExercise = exIdx === routine.main.length - 1;
    const nextExerciseName = isLastExercise ? null : routine.main[exIdx + 1].name;
    const workSeconds = ex.type === 'reps' ? ex.limitSeconds : ex.seconds;

    for (let setNo = 1; setNo <= ex.sets; setNo++) {
      const isLastSet = setNo === ex.sets;

      steps.push({
        kind: 'ready', name: ex.name, seconds: routine.readySeconds,
        exerciseId: ex.id, setNo, totalSets: ex.sets,
      });

      const work = {
        kind: 'work', name: ex.name, seconds: workSeconds,
        exerciseId: ex.id, type: ex.type, setNo, totalSets: ex.sets,
      };
      if (ex.type === 'reps') work.reps = ex.reps;
      steps.push(work);

      // 맨 마지막 종목의 마지막 세트 뒤에는 휴식을 붙이지 않는다 (바로 쿨다운)
      if (isLastExercise && isLastSet) continue;

      steps.push({
        kind: 'rest', name: '휴식', seconds: ex.restSeconds,
        exerciseId: ex.id, setNo, totalSets: ex.sets,
        nextName: isLastSet ? nextExerciseName : ex.name,
      });
    }
  });

  for (const c of routine.cooldown) {
    steps.push({ kind: 'cooldown', name: c.name, seconds: c.seconds });
  }

  return steps;
}

export function totalSeconds(steps) {
  return steps.reduce((sum, s) => sum + s.seconds, 0);
}
```

- [ ] **Step 4: 테스트 통과 확인**

```
node --test tests/timeline.test.mjs
```

기대: `# pass 11`, `# fail 0`

- [ ] **Step 5: 커밋**

```bash
git add js/timeline.js tests/timeline.test.mjs
git commit -m "feat: 루틴을 42단계 타임라인으로 전개"
```

---

## Task 3: 시간 표시 포맷

**Files:**
- Create: `js/format.js`
- Test: `tests/format.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
// tests/format.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatClock } from '../js/format.js';

test('60초 미만은 분 없이 초만', () => {
  assert.equal(formatClock(25), '25');
  assert.equal(formatClock(5), '5');
  assert.equal(formatClock(0), '0');
});

test('60초 이상은 M:SS', () => {
  assert.equal(formatClock(60), '1:00');
  assert.equal(formatClock(90), '1:30');
  assert.equal(formatClock(1521), '25:21');
});

test('음수는 0으로 취급', () => {
  assert.equal(formatClock(-3), '0');
});

test('소수점은 올림 — 0.2초 남았으면 아직 1초로 보여야 한다', () => {
  assert.equal(formatClock(0.2), '1');
  assert.equal(formatClock(24.7), '25');
});
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인**

```
node --test tests/format.test.mjs
```

기대: `Cannot find module .../js/format.js`

- [ ] **Step 3: 최소 구현 작성**

```js
// js/format.js

// 남은 시간을 화면에 띄울 문자열로. 2~3m 거리에서 읽어야 하므로 짧을수록 좋다.
// 60초 미만이면 분 표기를 생략한다.
export function formatClock(seconds) {
  const s = Math.ceil(Math.max(0, seconds));
  if (s < 60) return String(s);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
```

- [ ] **Step 4: 테스트 통과 확인**

```
node --test tests/format.test.mjs
```

기대: `# pass 4`, `# fail 0`

- [ ] **Step 5: 커밋**

```bash
git add js/format.js tests/format.test.mjs
git commit -m "feat: 남은 시간 표시 포맷"
```

---

## Task 4: 타이머 엔진

앱의 심장. **현재 시각을 주입받아** 단계를 진행시키고 이벤트를 뱉는다. `setInterval`이나 `Date.now()`를 직접 쓰지 않으므로 시간을 마음대로 조작해서 25분 전체를 밀리초 단위로 검증할 수 있다.

**뱉는 이벤트:**

```js
{ type: 'stepStart', index, step }
{ type: 'second', index, step, remaining }      // 남은 초가 정수로 바뀔 때마다 1번
{ type: 'stepEnd', index, step, actualSeconds, reason: 'timeout'|'skip' }
{ type: 'sessionEnd' }
```

**Files:**
- Create: `js/timer.js`
- Test: `tests/timer.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
// tests/timer.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTimer } from '../js/timer.js';

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
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인**

```
node --test tests/timer.test.mjs
```

기대: `Cannot find module .../js/timer.js`

- [ ] **Step 3: 최소 구현 작성**

```js
// js/timer.js
// 타임라인 진행 엔진.
// 현재 시각(ms)을 주입받는다 — Date.now()도 setInterval도 쓰지 않으므로
// 테스트에서 25분을 한순간에 흘려보낼 수 있다.

export function createTimer(steps) {
  let index = 0;
  let stepStartMs = 0;      // 현재 단계가 시작된 시각
  let lastTickMs = 0;       // 마지막으로 tick된 시각 (state()가 "지금"을 알아야 해서)
  let finishedBefore = 0;   // 이미 끝난 단계들의 실제 소요 시간 합(초)
  let lastRemaining = null; // 마지막으로 알린 남은 초
  let skipRequested = false;
  let finished = false;

  const totalPlanned = steps.reduce((sum, s) => sum + s.seconds, 0);

  function beginStep(nowMs) {
    stepStartMs = nowMs;
    lastRemaining = steps[index].seconds;
    return { type: 'stepStart', index, step: steps[index] };
  }

  function start(nowMs) {
    lastTickMs = nowMs;
    return [beginStep(nowMs)];
  }

  function tick(nowMs) {
    lastTickMs = nowMs;
    if (finished) return [];
    const events = [];

    while (!finished) {
      const step = steps[index];
      const elapsed = (nowMs - stepStartMs) / 1000;
      const ended = skipRequested || elapsed >= step.seconds;

      if (!ended) {
        // 남은 초가 줄어든 만큼 second 이벤트를 빠짐없이 발생시킨다
        const remaining = Math.ceil(step.seconds - elapsed);
        while (lastRemaining > remaining) {
          lastRemaining -= 1;
          events.push({ type: 'second', index, step, remaining: lastRemaining });
        }
        break;
      }

      const actualSeconds = skipRequested ? elapsed : step.seconds;
      const reason = skipRequested ? 'skip' : 'timeout';
      events.push({ type: 'stepEnd', index, step, actualSeconds, reason });

      finishedBefore += actualSeconds;
      skipRequested = false;

      if (index === steps.length - 1) {
        finished = true;
        events.push({ type: 'sessionEnd' });
        break;
      }

      index += 1;
      // 예정보다 일찍/늦게 끝났어도 다음 단계는 "실제로 끝난 시점"부터 시작한다
      events.push(beginStep(stepStartMs + actualSeconds * 1000));
    }

    return events;
  }

  function skip() {
    skipRequested = true;
  }

  function state() {
    const step = steps[index];
    if (finished) {
      return {
        index, step, remaining: 0, elapsed: step.seconds,
        totalElapsed: finishedBefore, totalSeconds: totalPlanned, finished: true,
      };
    }
    const elapsed = Math.max(0, (lastTickMs - stepStartMs) / 1000);
    return {
      index, step,
      remaining: Math.max(0, step.seconds - elapsed),
      elapsed,
      totalElapsed: finishedBefore + elapsed,
      totalSeconds: totalPlanned,
      finished: false,
    };
  }

  return { start, tick, skip, state };
}
```

- [ ] **Step 4: 테스트 통과 확인**

```
node --test tests/timer.test.mjs
```

기대: `# pass 11`, `# fail 0`

- [ ] **Step 5: 실제 루틴 전체를 흘려보내는 통합 테스트 추가**

```js
// tests/timer.test.mjs 맨 아래에 추가
import { ROUTINE } from '../js/routine.js';
import { buildTimeline } from '../js/timeline.js';

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
```

- [ ] **Step 6: 통합 테스트 통과 확인**

```
node --test tests/timer.test.mjs
```

기대: `# pass 14`, `# fail 0`

(이 14개는 계획 작성 시 실제로 작성해 통과를 확인한 것이다. 실패한다면 `js/timer.js` 구현이 위 코드와 다른 것이다.)

- [ ] **Step 7: 커밋**

```bash
git add js/timer.js tests/timer.test.mjs
git commit -m "feat: 타임라인 진행 엔진"
```

---

## Task 5: 음성 문구

이벤트를 한국어 문장으로 바꾼다. **문구 생성(순수 함수)과 실제 발화(브라우저 API)를 분리**해서 문구만 따로 테스트한다.

**Files:**
- Create: `js/coach.js`
- Test: `tests/coach.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
// tests/coach.test.mjs
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
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인**

```
node --test tests/coach.test.mjs
```

기대: `Cannot find module .../js/coach.js`

- [ ] **Step 3: 최소 구현 작성**

```js
// js/coach.js
// 이벤트를 한국어 음성 문구로 바꾼다.
// lineFor는 순수 함수 — 브라우저를 모른다. 실제 발화는 createCoach에 주입한다.
// 문구를 바꾸고 싶으면 이 파일만 고치면 된다.

const SET_WORDS = ['', '첫', '두', '세', '네', '다섯'];

export function lineFor(event) {
  if (event.type === 'sessionEnd') return '오늘 운동 끝났습니다. 참 잘하셨어요';
  if (event.type === 'stepEnd') return null;

  const step = event.step;

  if (event.type === 'stepStart') {
    switch (step.kind) {
      case 'warmup':
      case 'cooldown':
        return `${step.name}, ${step.seconds}초`;
      case 'ready':
        return `${step.name}, ${SET_WORDS[step.setNo]} 번째 세트. 준비`;
      case 'work':
        return step.type === 'reps'
          ? `시작. ${step.reps}회. 다 하시면 화면을 탭하세요`
          : `시작. ${step.seconds}초 버티세요`;
      case 'rest':
        return `완료. ${step.seconds}초 휴식. 다음은 ${step.nextName}`;
    }
    return null;
  }

  if (event.type === 'second') {
    const r = event.remaining;
    switch (step.kind) {
      case 'ready':
        return { 3: '셋', 2: '둘', 1: '하나' }[r] ?? null;
      case 'work':
        if (r === 10) return '10초 남았습니다';
        if (r === 5) return '좋습니다, 5초';
        return null;
      case 'rest':
        return r === 10 ? '10초 뒤 시작합니다. 자리로 오세요' : null;
      default:
        return null; // 웜업·쿨다운은 조용히
    }
  }

  return null;
}

export function createCoach(speak) {
  return {
    handle(event) {
      const line = lineFor(event);
      if (line) speak(line);
    },
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

```
node --test tests/coach.test.mjs
```

기대: `# pass 14`, `# fail 0`

- [ ] **Step 5: 커밋**

```bash
git add js/coach.js tests/coach.test.mjs
git commit -m "feat: 음성 코칭 문구"
```

---

## Task 6: 기록 저장

**저장 형태 — 2단계에서 AI 실측값이 들어올 자리를 미리 비워둔다:**

```js
{
  date: '2026-07-21',
  startedAt: '2026-07-21T13:02:11.000Z',
  endedAt: '2026-07-21T13:26:02.000Z',
  totalSeconds: 1431,
  completed: true,
  sets: [
    { exerciseId: 'deadhang', setNo: 1, targetSeconds: 25, actualSeconds: 25, actualReps: null, source: 'estimated' },
    { exerciseId: 'pushup',   setNo: 1, targetReps: 12,    actualSeconds: 31, actualReps: null, source: 'estimated' },
  ],
}
```

1단계에서는 `source`가 항상 `'estimated'`이고 `actualReps`는 항상 `null`이다. 2단계에서 AI가 붙으면 `'measured'`와 실제 횟수가 들어간다.

**Files:**
- Create: `js/storage.js`
- Test: `tests/storage.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
// tests/storage.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRecord, createStore } from '../js/storage.js';

const fakeStorage = () => {
  const mem = new Map();
  return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)) };
};

const endEvent = (over) => ({
  type: 'stepEnd',
  step: { kind: 'work', name: '데드행', exerciseId: 'deadhang', type: 'hold', seconds: 25, setNo: 1, totalSets: 3 },
  actualSeconds: 25,
  reason: 'timeout',
  ...over,
});

test('work 단계만 기록에 남는다 — 웜업·휴식·쿨다운은 버린다', () => {
  const rec = buildRecord({
    events: [
      endEvent(),
      { type: 'stepEnd', step: { kind: 'rest', name: '휴식', seconds: 60 }, actualSeconds: 60, reason: 'timeout' },
      { type: 'stepEnd', step: { kind: 'warmup', name: '어깨 회전', seconds: 40 }, actualSeconds: 40, reason: 'timeout' },
    ],
    startedAt: '2026-07-21T13:02:11.000Z',
    endedAt: '2026-07-21T13:26:02.000Z',
    completed: true,
  });
  assert.equal(rec.sets.length, 1);
  assert.equal(rec.sets[0].exerciseId, 'deadhang');
});

test('버티기 세트는 목표 시간과 실제 시간을 남긴다', () => {
  const rec = buildRecord({
    events: [endEvent({ actualSeconds: 19, reason: 'skip' })],
    startedAt: '2026-07-21T13:02:11.000Z', endedAt: '2026-07-21T13:26:02.000Z', completed: true,
  });
  assert.deepEqual(rec.sets[0], {
    exerciseId: 'deadhang', setNo: 1,
    targetSeconds: 25, targetReps: null,
    actualSeconds: 19, actualReps: null,
    source: 'estimated',
  });
});

test('팔굽혀펴기 세트는 목표 횟수를 남기고 실제 횟수는 비워둔다 (1단계)', () => {
  const rec = buildRecord({
    events: [endEvent({
      step: { kind: 'work', name: '팔굽혀펴기', exerciseId: 'pushup', type: 'reps', reps: 12, seconds: 60, setNo: 2, totalSets: 3 },
      actualSeconds: 31, reason: 'skip',
    })],
    startedAt: '2026-07-21T13:02:11.000Z', endedAt: '2026-07-21T13:26:02.000Z', completed: true,
  });
  assert.deepEqual(rec.sets[0], {
    exerciseId: 'pushup', setNo: 2,
    targetSeconds: null, targetReps: 12,
    actualSeconds: 31, actualReps: null,
    source: 'estimated',
  });
});

test('소수점 초는 반올림해서 저장한다', () => {
  const rec = buildRecord({
    events: [endEvent({ actualSeconds: 18.73, reason: 'skip' })],
    startedAt: '2026-07-21T13:02:11.000Z', endedAt: '2026-07-21T13:26:02.000Z', completed: true,
  });
  assert.equal(rec.sets[0].actualSeconds, 19);
});

test('날짜는 시작 시각의 현지 날짜, 총 소요 시간은 시작~종료 차이', () => {
  const rec = buildRecord({
    events: [endEvent()],
    startedAt: '2026-07-21T13:02:11.000Z', endedAt: '2026-07-21T13:26:02.000Z', completed: true,
  });
  assert.match(rec.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(rec.totalSeconds, 1431);
  assert.equal(rec.completed, true);
});

test('저장하고 다시 불러올 수 있다', () => {
  const s = fakeStorage();
  const store = createStore(s);
  const rec = buildRecord({
    events: [endEvent()],
    startedAt: '2026-07-21T13:02:11.000Z', endedAt: '2026-07-21T13:26:02.000Z', completed: true,
  });
  store.saveSession(rec);
  assert.equal(createStore(s).allSessions().length, 1);
  assert.equal(createStore(s).lastSession().sets[0].exerciseId, 'deadhang');
});

test('여러 번 저장하면 쌓이고, 날짜 오름차순으로 나온다', () => {
  const s = fakeStorage();
  const store = createStore(s);
  const mk = (date) => ({ date, startedAt: '', endedAt: '', totalSeconds: 100, completed: true, sets: [] });
  store.saveSession(mk('2026-07-23'));
  store.saveSession(mk('2026-07-21'));
  assert.deepEqual(store.allSessions().map((r) => r.date), ['2026-07-21', '2026-07-23']);
  assert.equal(store.lastSession().date, '2026-07-23');
});

test('기록이 없으면 빈 배열과 null', () => {
  const store = createStore(fakeStorage());
  assert.deepEqual(store.allSessions(), []);
  assert.equal(store.lastSession(), null);
});

test('저장된 값이 깨져 있어도 죽지 않고 빈 상태로 시작한다', () => {
  const s = fakeStorage();
  s.setItem('nightWorkout.v1', '{그럴듯하지만 깨진 JSON');
  const store = createStore(s);
  assert.deepEqual(store.allSessions(), []);
});

test('저장소를 못 쓰는 환경에서도 앱이 죽지 않는다', () => {
  const broken = {
    getItem: () => { throw new Error('차단됨'); },
    setItem: () => { throw new Error('차단됨'); },
  };
  const store = createStore(broken);
  assert.equal(store.available, false);
  assert.deepEqual(store.allSessions(), []);
  store.saveSession({ date: '2026-07-21', sets: [] }); // 던지지 않아야 한다
});
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인**

```
node --test tests/storage.test.mjs
```

기대: `Cannot find module .../js/storage.js`

- [ ] **Step 3: 최소 구현 작성**

```js
// js/storage.js
// 운동 기록 조립과 저장. storage 주입식이라 테스트 가능하다.
// 서버는 없다 — 기록은 이 기기 안에만 존재한다.

const KEY = 'nightWorkout.v1';

// 타이머가 뱉은 stepEnd 이벤트들을 하루치 기록으로 조립한다.
// work 단계만 남기고 나머지(웜업·휴식·쿨다운)는 버린다.
export function buildRecord({ events, startedAt, endedAt, completed }) {
  const sets = events
    .filter((e) => e.type === 'stepEnd' && e.step.kind === 'work')
    .map((e) => ({
      exerciseId: e.step.exerciseId,
      setNo: e.step.setNo,
      targetSeconds: e.step.type === 'reps' ? null : e.step.seconds,
      targetReps: e.step.type === 'reps' ? e.step.reps : null,
      actualSeconds: Math.round(e.actualSeconds),
      actualReps: null,        // 2단계에서 AI가 채운다
      source: 'estimated',     // 2단계에서 'measured'가 들어온다
    }));

  const start = new Date(startedAt);
  const end = new Date(endedAt);

  return {
    date: toLocalDate(start),
    startedAt,
    endedAt,
    totalSeconds: Math.round((end - start) / 1000),
    completed,
    sets,
  };
}

function toLocalDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function createStore(storage) {
  let available = true;
  try {
    storage.getItem(KEY);
  } catch {
    available = false;
  }

  function readAll() {
    if (!available) return [];
    try {
      const raw = storage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return []; // 깨진 데이터로 앱이 죽지 않게 한다
    }
  }

  return {
    available,

    allSessions() {
      return readAll().sort((a, b) => String(a.date).localeCompare(String(b.date)));
    },

    lastSession() {
      const all = this.allSessions();
      return all.length ? all[all.length - 1] : null;
    },

    saveSession(record) {
      if (!available) return;
      try {
        storage.setItem(KEY, JSON.stringify([...readAll(), record]));
      } catch {
        /* 저장 실패해도 운동은 계속된다 */
      }
    },
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

```
node --test tests/storage.test.mjs
```

기대: `# pass 10`, `# fail 0`

- [ ] **Step 5: 전체 테스트를 한 번에 돌려본다**

프로젝트 루트에서 **인자 없이** 실행한다 (`node --test tests/`는 Windows에서 실패한다).

```
node --test
```

기대: 5개 파일 전부 통과, `# pass 60`, `# fail 0`
(routine 7 + timeline 11 + format 4 + timer 14 + storage 10 = 60)

- [ ] **Step 6: 커밋**

```bash
git add js/storage.js tests/storage.test.mjs
git commit -m "feat: 운동 기록 조립과 저장"
```

---

## Task 7: 화면 뼈대와 스타일

여기서부터는 브라우저 쪽이라 자동 테스트가 없다. 대신 **각 태스크 끝에서 눈으로 확인**한다.

**Files:**
- Create: `index.html`, `css/style.css`

- [ ] **Step 1: `index.html` 작성**

```html
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#0b0f14">
  <title>야간 운동</title>
  <link rel="manifest" href="manifest.json">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <!-- 홈 -->
  <section id="screen-home" class="screen is-active">
    <h1 class="home-title">야간 운동</h1>
    <p id="home-last" class="home-last">아직 기록이 없습니다</p>
    <button id="btn-start" class="btn-start">오늘 운동 시작</button>
    <p class="home-hint">25분 · 웜업 3분 → 메인 19분 → 쿨다운 3분</p>
  </section>

  <!-- 운동 -->
  <section id="screen-workout" class="screen">
    <div id="tap-area" class="tap-area">
      <p id="w-title" class="w-title">준비</p>
      <p id="w-clock" class="w-clock">0</p>
      <p id="w-sub" class="w-sub"></p>
      <div class="w-progress"><div id="w-progress-bar" class="w-progress-bar"></div></div>
      <p class="w-tap-hint">화면을 탭하면 다음으로 넘어갑니다</p>
      <button id="btn-quit" class="btn-quit">그만두기</button>
    </div>
  </section>

  <!-- 완료 -->
  <section id="screen-done" class="screen">
    <h2 class="done-title">참 잘했어요</h2>
    <p id="done-total" class="done-total"></p>
    <ul id="done-list" class="done-list"></ul>
    <button id="btn-home" class="btn-start">홈으로</button>
  </section>

  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: `css/style.css` 작성**

```css
/* 야간 운동 — 밤에 보는 화면이라 전체를 어둡게, 숫자는 최대한 크게 */

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: #0b0f14;
  color: #e8eef5;
  font-family: system-ui, -apple-system, 'Malgun Gothic', sans-serif;
  overflow: hidden;
  height: 100vh;
  -webkit-user-select: none;
  user-select: none;
}

.screen { display: none; height: 100vh; padding: env(safe-area-inset-top) 1rem 1rem; }
.screen.is-active { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.2rem; }

/* --- 홈 --- */
.home-title { font-size: 2rem; font-weight: 700; letter-spacing: -0.02em; }
.home-last { color: #8fa3b8; font-size: 0.95rem; text-align: center; line-height: 1.6; }
.home-hint { color: #5d7189; font-size: 0.85rem; }

.btn-start {
  background: #2f81f7; color: #fff; border: 0; border-radius: 999px;
  padding: 1.1rem 2.6rem; font-size: 1.25rem; font-weight: 700;
  font-family: inherit; cursor: pointer;
}
.btn-start:active { background: #2568c9; }

/* --- 운동 --- */
.tap-area {
  width: 100%; height: 100%;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0.6rem; cursor: pointer;
}
.w-title { font-size: 1.6rem; font-weight: 600; color: #cfe0f2; text-align: center; }
.w-clock {
  font-size: 34vh; line-height: 0.95; font-weight: 800;
  font-variant-numeric: tabular-nums; letter-spacing: -0.04em;
}
.w-clock.is-warning { color: #ffcc4d; }
.w-sub { font-size: 1.1rem; color: #8fa3b8; text-align: center; min-height: 1.5em; }

.w-progress { width: 80%; height: 4px; background: #1c2733; border-radius: 999px; overflow: hidden; }
.w-progress-bar { height: 100%; width: 0%; background: #2f81f7; transition: width 0.3s linear; }

.w-tap-hint { font-size: 0.8rem; color: #44586e; }
.btn-quit {
  position: fixed; top: calc(env(safe-area-inset-top) + 0.6rem); right: 0.8rem;
  background: transparent; color: #44586e; border: 1px solid #22303d;
  border-radius: 999px; padding: 0.4rem 0.9rem; font-size: 0.8rem;
  font-family: inherit; cursor: pointer;
}

/* --- 완료 --- */
.done-title { font-size: 1.8rem; font-weight: 700; }
.done-total { color: #8fa3b8; }
.done-list { list-style: none; width: 100%; max-width: 22rem; }
.done-list li {
  display: flex; justify-content: space-between;
  padding: 0.55rem 0.2rem; border-bottom: 1px solid #1c2733; font-size: 0.95rem;
}
.done-list li span:last-child { color: #8fa3b8; font-variant-numeric: tabular-nums; }

/* 가로로 눕혔을 때: 숫자를 더 키우고 잔글씨는 줄인다 */
@media (orientation: landscape) {
  .w-clock { font-size: 52vh; }
  .w-title { font-size: 1.3rem; }
  .w-tap-hint { display: none; }
}
```

- [ ] **Step 3: 눈으로 확인**

로컬에서 열어본다.

```bash
python -m http.server 8000
```

브라우저에서 `http://localhost:8000` 을 연다. 기대: 어두운 배경에 "야간 운동" 제목과 파란 「오늘 운동 시작」 버튼이 가운데 보인다. (아직 눌러도 아무 일도 안 일어난다 — `app.js`가 없으므로 콘솔에 404가 뜬다. 정상이다.)

- [ ] **Step 4: 커밋**

```bash
git add index.html css/style.css
git commit -m "feat: 화면 3개 뼈대와 야간용 어두운 스타일"
```

---

## Task 8: 화면 갱신

DOM을 만지는 유일한 곳. `app.js`가 여기에 데이터를 넘겨주면 화면을 바꾼다.

**Files:**
- Create: `js/ui.js`

- [ ] **Step 1: 구현 작성**

```js
// js/ui.js
// DOM을 만지는 유일한 파일. 로직은 없고 "받은 값을 화면에 그리기"만 한다.

import { formatClock } from './format.js';

const EXERCISE_NAMES = {
  deadhang: '데드행',
  pushup: '팔굽혀펴기',
  dips: '딥스 버티기',
  legraise: '다리 들고 버티기',
};

const $ = (id) => document.getElementById(id);

export function createUI() {
  const screens = {
    home: $('screen-home'),
    workout: $('screen-workout'),
    done: $('screen-done'),
  };

  return {
    show(name) {
      for (const [key, el] of Object.entries(screens)) {
        el.classList.toggle('is-active', key === name);
      }
    },

    // 홈: 마지막 운동 요약 한 줄
    renderHome(lastSession) {
      const el = $('home-last');
      if (!lastSession) {
        el.textContent = '아직 기록이 없습니다';
        return;
      }
      const mins = Math.round(lastSession.totalSeconds / 60);
      el.textContent = `마지막 운동 ${lastSession.date} · ${mins}분 · ${lastSession.completed ? '완주' : '중단'}`;
    },

    // 운동 화면: 매 프레임 호출된다
    renderWorkout(state) {
      const { step, remaining, totalElapsed, totalSeconds } = state;

      $('w-title').textContent = titleFor(step);
      $('w-clock').textContent = formatClock(remaining);
      $('w-clock').classList.toggle('is-warning', step.kind !== 'rest' && remaining <= 5);
      $('w-sub').textContent = subFor(step);
      $('w-progress-bar').style.width = `${Math.min(100, (totalElapsed / totalSeconds) * 100)}%`;
    },

    // 완료 화면
    renderDone(record) {
      const m = Math.floor(record.totalSeconds / 60);
      const s = record.totalSeconds % 60;
      $('done-total').textContent = `${record.date} · 총 ${m}분 ${s}초 · ${record.completed ? '완주' : '중단'}`;

      const byExercise = new Map();
      for (const set of record.sets) {
        if (!byExercise.has(set.exerciseId)) byExercise.set(set.exerciseId, []);
        byExercise.get(set.exerciseId).push(set);
      }

      $('done-list').innerHTML = '';
      for (const [id, sets] of byExercise) {
        const li = document.createElement('li');
        const name = document.createElement('span');
        const value = document.createElement('span');
        name.textContent = EXERCISE_NAMES[id] ?? id;
        value.textContent = sets.map((x) => `${x.actualSeconds}초`).join(' / ');
        li.append(name, value);
        $('done-list').append(li);
      }
    },
  };
}

function titleFor(step) {
  switch (step.kind) {
    case 'warmup': return `웜업 · ${step.name}`;
    case 'cooldown': return `쿨다운 · ${step.name}`;
    case 'ready': return `${step.name} · 준비`;
    case 'work': return `${step.name} · ${step.setNo}세트 / ${step.totalSets}`;
    case 'rest': return '휴식';
    default: return step.name;
  }
}

function subFor(step) {
  if (step.kind === 'rest') return `다음: ${step.nextName}`;
  if (step.kind === 'work' && step.type === 'reps') return `목표 ${step.reps}회 · 다 하면 탭`;
  return '';
}
```

- [ ] **Step 2: 커밋**

```bash
git add js/ui.js
git commit -m "feat: 화면 갱신 모듈"
```

---

## Task 9: 화면 꺼짐 방지

25분간 화면이 꺼지면 안 된다. 브라우저가 지원하지 않아도 앱은 그대로 돌아가야 한다.

**Files:**
- Create: `js/wakelock.js`

- [ ] **Step 1: 구현 작성**

```js
// js/wakelock.js
// 운동 중 화면이 꺼지지 않게 한다.
// 지원하지 않는 브라우저에서는 조용히 아무것도 안 한다 — 앱은 그대로 돌아간다.

export function createWakeLock() {
  let lock = null;

  async function acquire() {
    if (!('wakeLock' in navigator)) return false;
    try {
      lock = await navigator.wakeLock.request('screen');
      return true;
    } catch {
      return false;
    }
  }

  async function release() {
    try {
      await lock?.release();
    } catch {
      /* 이미 풀렸으면 무시 */
    }
    lock = null;
  }

  // 다른 앱에 갔다 돌아오면 잠금이 풀려 있다. 돌아왔을 때 다시 건다.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && lock !== null) acquire();
  });

  return { acquire, release };
}
```

- [ ] **Step 2: 커밋**

```bash
git add js/wakelock.js
git commit -m "feat: 운동 중 화면 꺼짐 방지"
```

---

## Task 10: 조립

조각들을 하나로 묶는다. 브라우저 API(시각, 음성, 애니메이션 루프)를 아는 유일한 곳이다.

**Files:**
- Create: `js/app.js`

- [ ] **Step 1: 구현 작성**

```js
// js/app.js
// 조립 담당. 브라우저 API(시각·음성·애니메이션 루프)를 아는 유일한 파일.

import { ROUTINE } from './routine.js';
import { buildTimeline } from './timeline.js';
import { createTimer } from './timer.js';
import { createCoach } from './coach.js';
import { buildRecord, createStore } from './storage.js';
import { createUI } from './ui.js';
import { createWakeLock } from './wakelock.js';

const ui = createUI();
const store = createStore(safeLocalStorage());
const wakeLock = createWakeLock();
const coach = createCoach(speak);

let timer = null;
let rafId = null;
let stepEndEvents = [];
let startedAt = null;

// --- 음성 ---------------------------------------------------------------

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  u.rate = 1.05;
  window.speechSynthesis.speak(u);
}

// 안드로이드 크롬은 사용자가 화면을 누른 적이 없으면 음성을 막는다.
// 시작 버튼을 누르는 순간 빈 문장을 한 번 흘려서 잠금을 푼다.
function unlockSpeech() {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  window.speechSynthesis.speak(u);
}

function safeLocalStorage() {
  try {
    return window.localStorage;
  } catch {
    return { getItem: () => { throw new Error('차단됨'); }, setItem: () => { throw new Error('차단됨'); } };
  }
}

// --- 세션 진행 -----------------------------------------------------------

function startSession() {
  unlockSpeech();
  wakeLock.acquire();

  const steps = buildTimeline(ROUTINE);
  timer = createTimer(steps);
  stepEndEvents = [];
  startedAt = new Date().toISOString();

  ui.show('workout');
  handleEvents(timer.start(performance.now()));
  rafId = requestAnimationFrame(loop);
}

function loop() {
  handleEvents(timer.tick(performance.now()));
  if (!timer.state().finished) {
    ui.renderWorkout(timer.state());
    rafId = requestAnimationFrame(loop);
  }
}

function handleEvents(events) {
  for (const e of events) {
    coach.handle(e);
    if (e.type === 'stepEnd') stepEndEvents.push(e);
    if (e.type === 'sessionEnd') finishSession(true);
  }
}

function finishSession(completed) {
  cancelAnimationFrame(rafId);
  wakeLock.release();

  const record = buildRecord({
    events: stepEndEvents,
    startedAt,
    endedAt: new Date().toISOString(),
    completed,
  });
  store.saveSession(record);

  ui.renderDone(record);
  ui.show('done');
}

function quitSession() {
  window.speechSynthesis?.cancel();
  finishSession(false);
}

function goHome() {
  ui.renderHome(store.lastSession());
  ui.show('home');
}

// --- 이벤트 연결 ---------------------------------------------------------

document.getElementById('btn-start').addEventListener('click', startSession);
document.getElementById('btn-home').addEventListener('click', goHome);

document.getElementById('btn-quit').addEventListener('click', (e) => {
  e.stopPropagation(); // 탭 영역으로 번지지 않게
  quitSession();
});

// 화면 아무 데나 탭 = 현재 단계 즉시 종료
document.getElementById('tap-area').addEventListener('click', () => {
  timer?.skip();
});

goHome();
```

- [ ] **Step 2: 브라우저에서 처음부터 끝까지 확인**

```bash
python -m http.server 8000
```

`http://localhost:8000` 에서 다음을 순서대로 확인한다.

1. 「오늘 운동 시작」을 누르면 운동 화면으로 바뀌고 **"어깨 회전, 40초"** 라는 음성이 나온다
2. 큰 숫자가 1초에 하나씩 줄어든다
3. 화면을 탭하면 **즉시** 다음 단계로 넘어가고 다음 안내 음성이 나온다
4. 탭을 계속 눌러 42단계를 빠르게 통과시킨다 → 마지막에 **"오늘 운동 끝났습니다"** 음성과 함께 완료 화면이 뜬다
5. 완료 화면에 종목 4개와 세트별 초가 보인다
6. 「홈으로」를 누르면 홈에 **"마지막 운동 2026-… · N분 · 완주"** 한 줄이 생긴다
7. 새로고침해도 그 한 줄이 남아 있다 (저장 확인)
8. 다시 시작해서 「그만두기」를 누르면 **"중단"** 으로 기록된다

브라우저 콘솔에 에러가 없어야 한다.

- [ ] **Step 3: 커밋**

```bash
git add js/app.js
git commit -m "feat: 조각 조립 — 25분 세션이 처음부터 끝까지 돌아간다"
```

---

## Task 11: 홈 화면 아이콘 (PWA)

**Files:**
- Create: `manifest.json`, `tools/make_icons.py`, `icons/icon-192.png`, `icons/icon-512.png`

- [ ] **Step 1: 아이콘 생성 스크립트 작성**

```python
# tools/make_icons.py
# 홈 화면 아이콘 생성. 한 번만 돌리면 된다.
#   python tools/make_icons.py
from PIL import Image, ImageDraw
from pathlib import Path

BG = (11, 15, 20)       # 앱 배경과 같은 어두운 남색
BAR = (47, 129, 247)    # 앱 강조색 파랑

def make(size: int) -> Image.Image:
    """치닝디핑 바에 매달린 사람을 단순한 도형으로."""
    img = Image.new("RGB", (size, size), BG)
    d = ImageDraw.Draw(img)
    u = size / 32  # 격자 단위

    # 가로 바
    d.rounded_rectangle([4*u, 8*u, 28*u, 9.6*u], radius=0.8*u, fill=BAR)
    # 양쪽 기둥
    d.rectangle([4*u, 8*u, 5.6*u, 12*u], fill=BAR)
    d.rectangle([26.4*u, 8*u, 28*u, 12*u], fill=BAR)
    # 매달린 팔
    d.rounded_rectangle([11*u, 9.6*u, 12.6*u, 15*u], radius=0.8*u, fill=BAR)
    d.rounded_rectangle([19.4*u, 9.6*u, 21*u, 15*u], radius=0.8*u, fill=BAR)
    # 머리
    d.ellipse([14.4*u, 13*u, 17.6*u, 16.2*u], fill=BAR)
    # 몸통
    d.rounded_rectangle([14.2*u, 16.4*u, 17.8*u, 24*u], radius=1.2*u, fill=BAR)
    # 다리
    d.rounded_rectangle([14.2*u, 24*u, 15.6*u, 28.5*u], radius=0.7*u, fill=BAR)
    d.rounded_rectangle([16.4*u, 24*u, 17.8*u, 28.5*u], radius=0.7*u, fill=BAR)
    return img

if __name__ == "__main__":
    out = Path(__file__).resolve().parent.parent / "icons"
    out.mkdir(exist_ok=True)
    for s in (192, 512):
        make(s).save(out / f"icon-{s}.png")
        print(f"wrote icons/icon-{s}.png")
```

- [ ] **Step 2: 아이콘 생성**

```bash
python tools/make_icons.py
```

기대 출력:
```
wrote icons/icon-192.png
wrote icons/icon-512.png
```

생성된 `icons/icon-512.png`를 열어서 어두운 배경에 파란 "바에 매달린 사람" 형태가 보이는지 눈으로 확인한다.

- [ ] **Step 3: `manifest.json` 작성**

```json
{
  "name": "야간 운동",
  "short_name": "야간운동",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#0b0f14",
  "theme_color": "#0b0f14",
  "lang": "ko",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- [ ] **Step 4: 매니페스트가 제대로 읽히는지 확인**

`python -m http.server 8000` 을 띄운 상태에서 크롬 개발자도구 → Application → Manifest를 연다.

기대: 이름 "야간 운동", 아이콘 2개가 미리보기로 보이고, 빨간 오류 표시가 없다.

- [ ] **Step 5: 커밋**

```bash
git add manifest.json tools/make_icons.py icons/
git commit -m "feat: 홈 화면 아이콘(PWA) 설정"
```

---

## Task 12: 배포와 실기기 확인

카메라는 아직 안 쓰지만, **음성·화면 유지·홈 화면 아이콘은 실제 폰에서만 검증된다.** 그리고 GitHub Pages는 2단계에서 카메라를 쓰려면 어차피 필요하다.

**Files:**
- Create: `README.md`

- [ ] **Step 1: `README.md` 작성**

````markdown
# 야간 운동

치닝디핑 25분 야간 루틴을 음성으로 자동 진행하는 개인용 웹앱.

## 쓰는 법

폰 크롬에서 배포 주소를 열고 **메뉴 → 홈 화면에 추가**. 이후 아이콘으로 실행한다.

## 개발

빌드 도구가 없다. 파일을 고치면 바로 반영된다.

```bash
# 로컬에서 열기
python -m http.server 8000

# 테스트 (인자 없이. Windows에서 `node --test tests/`는 실패한다)
node --test
```

## 루틴 바꾸기

`js/routine.js` 의 숫자만 고치면 앱 전체가 따라간다. 다른 파일은 건드릴 필요 없다.

## 문서

- 설계: `docs/superpowers/specs/2026-07-21-night-workout-design.md`
- 1단계 계획: `docs/superpowers/plans/2026-07-21-phase1-timer-app.md`
````

- [ ] **Step 2: 전체 테스트를 마지막으로 한 번 더**

```bash
node --test
```

기대: `# pass 60`, `# fail 0`

- [ ] **Step 3: 커밋**

```bash
git add README.md
git commit -m "docs: README"
```

- [ ] **Step 4: GitHub 저장소를 만들고 올린다**

```bash
gh repo create night-workout --public --source=. --remote=origin --push
```

- [ ] **Step 5: GitHub Pages를 켠다**

```bash
gh api -X POST repos/:owner/night-workout/pages -f "source[branch]=main" -f "source[path]=/"
```

에러가 나면 GitHub 웹에서 Settings → Pages → Source를 `main` / `/ (root)`로 직접 설정한다.

1~2분 뒤 주소를 확인한다.

```bash
gh api repos/:owner/night-workout/pages --jq .html_url
```

- [ ] **Step 6: 폰(갤럭시)에서 최종 확인**

크롬으로 위 주소를 열고 다음을 **전부** 확인한다. 하나라도 안 되면 고치고 다시 확인한다.

- [ ] 홈 화면이 뜨고 「오늘 운동 시작」 버튼이 보인다
- [ ] **메뉴 → 홈 화면에 추가** 가 되고, 아이콘이 파란 사람 모양으로 보인다
- [ ] 아이콘으로 실행하면 주소창 없이 전체화면으로 뜬다
- [ ] 시작을 누르면 **한국어 음성**이 나온다 (안 나오면: 폰 미디어 볼륨 확인 → 크롬 사이트 설정에서 소리 허용 확인)
- [ ] 폰을 **가로로 눕히면** 숫자가 더 커진다
- [ ] 큰 숫자가 **2~3m 떨어진 곳에서 읽힌다** (기구 앞에 실제로 서서 확인)
- [ ] 웜업 3분 동안 **화면이 안 꺼진다**
- [ ] 화면 탭이 잘 먹는다
- [ ] 「그만두기」 후 홈에 기록 한 줄이 남는다
- [ ] 앱을 완전히 껐다 다시 켜도 기록이 남아 있다

- [ ] **Step 7: 실제로 한 번 운동해본다**

여기까지 오면 1단계는 완성이다. **며칠 실제로 써보고** 아래를 메모해둔다. 2단계 설계에 반영한다.

- 휴식 90초가 너무 길거나 짧지 않았는가
- 음성 문구 중 거슬리거나 부족한 것
- 팔굽혀펴기 60초 상한이 적당한가
- 폰을 어디에 어떻게 놓게 되는가 (2단계 카메라 위치 결정에 필요)

---

## 완료 기준

- [ ] `node --test` 전부 통과 (5개 파일, 60개 테스트)
- [ ] 폰에서 홈 화면 아이콘으로 실행되고, 25분이 음성과 함께 자동으로 흘러간다
- [ ] 화면이 25분간 안 꺼진다
- [ ] 운동 기록이 저장되고 앱을 껐다 켜도 남아 있다
- [ ] 실제로 최소 1회 이 앱으로 운동을 해봤다
