// 오늘 프로그램을 "앞에서부터 순서대로 실행하면 되는" 단계 목록으로 펼친다. 순수 함수.
//
// 단계 종류
//   warmup / cooldown : { name, seconds, pose, say }
//   rest              : { seconds, prep?, after?, next: work 단계 }   ← 마지막 3초가 비프음 카운트다운
//   work              : { exId, group, lv, name, type, target, seconds, setNo, totalSets, pose, tip, cue }
//   ride (자전거)      : { zone: 'easy'|'target'|'hill'|'cool', seconds, hr, nextZone?, afterHill? }

import {
  STRENGTH, BIKE, HR, SETS, LIGHT_SETS, LIGHT_REST_PLUS, PREP_SEC,
  WARMUP_STRENGTH, COOLDOWN_STRENGTH, COOLDOWN_BIKE, BIKE_COOL_RIDE, levelOf, limitSec,
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
        target: l.type === 'hold' ? l.sec : l.reps,
        seconds: l.type === 'hold' ? l.sec : limitSec(l),
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

export function bikeDay(bikeLv, mode = 'normal') {
  const light = mode === 'light';
  const l = levelOf('bike', bikeLv);
  const hr = light ? HR.light : HR.target;
  const main = light ? Math.round((l.main * 2) / 3) * 60 : l.main * 60;
  const hills = light ? 0 : l.hills;
  const ride = (zone, seconds, extra) => ({ kind: 'ride', zone, seconds, pose: 'bike', ...extra });

  const segs = [ride('easy', BIKE.warm, { name: '웜업', hr: [0, HR.easyMax] })];
  if (!hills) {
    segs.push(ride('target', main, { name: '목표 구간', hr }));
  } else {
    const gap = Math.floor((main - hills * l.hillSec) / (hills + 1));
    const last = main - hills * l.hillSec - gap * hills;
    for (let i = 0; i < hills; i++) {
      segs.push(ride('target', gap, { name: '목표 구간', hr, afterHill: i > 0 }));
      segs.push(ride('hill', l.hillSec, { name: '언덕 구간', hr: HR.hill, hillNo: i + 1, hills }));
    }
    segs.push(ride('target', last, { name: '목표 구간', hr, afterHill: true }));
  }
  segs.push(ride('cool', BIKE_COOL_RIDE, { name: '쿨다운', hr: [0, HR.easyMax] }));
  segs.forEach((s, i) => { if (segs[i + 1]) s.nextZone = segs[i + 1].zone; });

  return [...segs, ...COOLDOWN_BIKE.map(item('cooldown'))];
}

// 아픈 날: 스트레칭만
export function stretchDay() {
  return [...COOLDOWN_STRENGTH, ...COOLDOWN_BIKE.slice(1)].map(item('cooldown'));
}

export function totalSeconds(steps) {
  return steps.reduce((sum, s) => sum + s.seconds, 0);
}
