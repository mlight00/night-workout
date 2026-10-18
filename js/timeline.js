// 오늘 프로그램을 "앞에서부터 순서대로 실행하면 되는" 단계 목록으로 펼친다. 순수 함수.
//
// 단계 종류
//   warmup / cooldown : { name, seconds, pose, say }
//   rest              : { seconds, prep?, after?, next: work 단계 }   ← 마지막 3초가 비프음 카운트다운
//   work              : { exId, group, lv, name, type, target, seconds, setNo, totalSets, pose, tip, cue }
//   ride (자전거)      : { zone, seconds, name, res(저항), feel(느낌), hr, routine, main?, n/of, k/dir(피라미드), nextZone, upNext, beepEnd }
//                        zone = easy·build(웜업) | target·climb(꾸준히·피라미드) | hard·recover(인터벌) | fast·recover(빠르게) | cool

import {
  STRENGTH, BIKE, HR, SETS, LIGHT_SETS, LIGHT_REST_PLUS, PREP_SEC,
  WARMUP_STRENGTH, COOLDOWN_STRENGTH, COOLDOWN_BIKE, BIKE_COOL_RIDE, BIKE_WARM, BIKE_ROUTINES, BIKE_ROTATION,
  levelOf, limitSec, repsFor,
} from './program.js';

const item = (kind) => (x) => ({ kind, name: x.name, seconds: x.sec, pose: x.pose, say: x.say });

export function strengthDay(levels, mode = 'normal') {
  const light = mode === 'light';
  const sets = light ? LIGHT_SETS : SETS;
  const steps = WARMUP_STRENGTH.map(item('warmup'));

  const works = [];
  for (const ex of STRENGTH) {
    const lv = levels[ex.id].lv;
    const l = levelOf(ex.id, lv);
    for (let setNo = 1; setNo <= sets; setNo++) {
      works.push({
        kind: 'work', exId: ex.id, group: ex.group, lv, name: l.name, type: l.type,
        target: l.type === 'hold' ? l.sec : repsFor(l, setNo),
        seconds: l.type === 'hold' ? l.sec : limitSec(l, setNo),
        setNo, totalSets: sets, pose: l.pose, tip: l.tip, cue: ex.cue,
        rest: ex.rest + (light ? LIGHT_REST_PLUS : 0), after: ex.after,
      });
    }
  }

  steps.push({ kind: 'rest', prep: true, name: '준비', seconds: PREP_SEC, next: works[0] });
  works.forEach((w, i) => {
    steps.push(w);
    const next = works[i + 1];
    if (next) steps.push({ kind: 'rest', name: '휴식', seconds: w.rest, after: w.after, next });
  });

  steps.push(...COOLDOWN_STRENGTH.map(item('cooldown')));
  return steps;
}

// 자전거 날: 웜업(편하게 → 올리기) → 루틴 → 쿨다운 → 스트레칭.
// 가볍게 모드는 루틴과 상관없이 "꾸준히"(낮은 심박, 메인 ⅔).
export function bikeDay(bikeLv, mode = 'normal', routine = BIKE_ROTATION[0]) {
  const light = mode === 'light';
  const l = levelOf('bike', bikeLv);
  const main = (light ? Math.round((l.main * 2) / 3) : l.main) * 60;
  const kind = light ? 'steady' : BIKE_ROUTINES[routine] ? routine : BIKE_ROTATION[0];
  const ride = (zone, seconds, extra) => ({ kind: 'ride', zone, seconds, pose: 'bike', routine: kind, ...extra });

  const segs = [
    ride('easy', BIKE_WARM.easy, { name: '웜업 — 편하게', res: '가장 낮게', feel: '아주 편하게', hr: [0, HR.easyMax] }),
    ride('build', BIKE_WARM.build, { name: '웜업 — 올리기', res: '+1~2', feel: '숨이 조금 차게', hr: HR.build }),
    ...bikeMain(kind, main, Math.min(l.tier, 4) - 1, light).map((x) => ({ ...ride(x.zone, x.seconds, x), main: true })),
    ride('cool', BIKE_COOL_RIDE, { name: '쿨다운', res: '가장 낮게', feel: '천천히', hr: [0, HR.easyMax] }),
  ];
  // 다음 구간이 더 힘들면: 10초 전에 미리 알리고, 비프음으로 시작 신호
  segs.forEach((x, i) => {
    const n = segs[i + 1];
    if (!n) return;
    x.nextZone = n.zone;
    x.upNext = { zone: n.zone, name: n.name, res: n.res, dir: n.dir };
    x.beepEnd = n.zone === 'hard' || n.zone === 'fast' || (n.zone === 'climb' && n.dir === 'up');
  });
  return [...segs, ...COOLDOWN_BIKE.map(item('cooldown'))];
}

const hrUp = (k) => [Math.min(105 + 5 * k, HR.hard[0]), Math.min(120 + 5 * k, HR.hard[1])];
const PYR_FEEL = ['대화 가능', '대화 가능, 숨이 조금 참', '짧은 문장 정도', '짧은 말만 가능'];

// 메인 구간들 [{ zone, seconds, name, res, feel, hr, ... }] — 남는 초는 마지막 편한 구간에 붙인다
export function bikeMain(kind, main, t, light) {
  const R = BIKE_ROUTINES[kind];
  if (kind === 'interval' || kind === 'speed') {
    const [hard, easy] = R.cycle[t];
    const n = Math.max(1, Math.floor(main / (hard + easy)));
    const out = [];
    for (let i = 1; i <= n; i++) {
      out.push(kind === 'interval'
        ? { zone: 'hard', seconds: hard, n: i, of: n, name: `세게 ${i}/${n}`, res: '+2', feel: '짧은 말만 가능', hr: HR.hard }
        : { zone: 'fast', seconds: hard, n: i, of: n, name: `빠르게 ${i}/${n}`, res: '그대로', feel: '다리를 빠르게', hr: [0, HR.hard[1]] });
      out.push({ zone: 'recover', seconds: easy, n: i, of: n, name: '편하게', res: kind === 'interval' ? '원래대로' : '그대로', feel: '대화 가능, 숨 고르기', hr: HR.target });
    }
    out.at(-1).seconds += main - n * (hard + easy);
    return out;
  }
  if (kind === 'pyramid') {
    const steps = R.steps[t], each = Math.floor(main / steps.length / 10) * 10; // 10초 단위로 (말하기 쉽게)
    return steps.map((k, i) => {
      const prev = i ? steps[i - 1] : null;
      const dir = prev == null ? 'first' : k > prev ? 'up' : k < prev ? 'down' : 'same';
      return {
        zone: k ? 'climb' : 'target', seconds: each + (i === steps.length - 1 ? main - each * steps.length : 0),
        k, dir, n: i + 1, of: steps.length, each,
        name: `${k ? `저항 +${k}` : '기본 저항'} · ${i + 1}/${steps.length}`, res: k ? `+${k}` : '기본', feel: PYR_FEEL[k], hr: hrUp(k),
      };
    });
  }
  return [{ zone: 'target', seconds: main, name: '꾸준히', res: '편한 정도', feel: '대화 가능', hr: light ? HR.light : HR.target }];
}

// 홈에 보여 줄 루틴 한 줄 요약
export function routineSummary(kind, bikeLv) {
  const l = levelOf('bike', bikeLv), t = Math.min(l.tier, 4) - 1, R = BIKE_ROUTINES[kind];
  const sec = (s) => (s % 60 ? (s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s}초`) : `${s / 60}분`);
  if (kind === 'interval' || kind === 'speed') {
    const [a, b] = R.cycle[t], n = Math.max(1, Math.floor((l.main * 60) / (a + b)));
    return `${kind === 'interval' ? '세게' : '빠르게'} ${sec(a)} × ${n}번 · 사이 편하게 ${sec(b)}`;
  }
  if (kind === 'pyramid') {
    const st = R.steps[t];
    return `저항 기본 → +${Math.max(...st)} → 기본, ${sec(Math.floor((l.main * 60) / st.length / 10) * 10)}씩`;
  }
  return `${l.main}분 동안 심박 ${HR.target[0]}~${HR.target[1]}`;
}

// 아픈 날: 스트레칭만
export function stretchDay() {
  return [...COOLDOWN_STRENGTH, ...COOLDOWN_BIKE.slice(1)].map(item('cooldown'));
}

export function totalSeconds(steps) {
  return steps.reduce((sum, s) => sum + s.seconds, 0);
}
