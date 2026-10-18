// 운동 프로그램 정의 — 레벨 사다리. 숫자를 고치면 앱 전체가 따라간다.
// type 'hold' = 시간 버티기(sec), 'reps' = 횟수(reps, tempo = 1회당 예상 초)
//   reps를 배열로 주면 세트별 목표 (예: [15, 10, 8] = 1세트 15회, 2세트 10회, 3세트 8회)
// pose = 3D 자세 id (body3d/poses.js)

const H = (name, sec, pose, extra) => ({ name, type: 'hold', sec, pose, ...extra });
const N = (name, reps, pose, extra) => ({ name, type: 'reps', reps, tempo: 4, pose, ...extra });

export const SETS = 3;
export const LIGHT_SETS = 2;
export const LIGHT_REST_PLUS = 15;
export const PREP_SEC = 20;

export const STRENGTH = [
  {
    id: 'hang', group: '매달리기', rest: 60, start: 1, after: '발판 딛고 천천히 내려오세요',
    levels: [
      H('데드행', 20, 'deadhang', { tip: '어깨를 귀에서 멀리' }),
      H('데드행', 25, 'deadhang', { tip: '어깨를 귀에서 멀리' }),
      H('데드행', 30, 'deadhang', { tip: '어깨를 귀에서 멀리' }),
      H('데드행', 40, 'deadhang', { tip: '어깨를 귀에서 멀리' }),
      N('스캐풀라 풀업', 5, 'scappull', { tip: '팔은 편 채 어깨만 아래로' }),
      N('스캐풀라 풀업', 8, 'scappull', { tip: '팔은 편 채 어깨만 아래로' }),
      N('네거티브 친업', 3, 'negchin', { tempo: 10, tip: '발판 딛고 올라가 5초 동안 내려오기' }),
      N('네거티브 친업', 5, 'negchin', { tempo: 10, tip: '발판 딛고 올라가 5초 동안 내려오기' }),
      N('친업', 2, 'chinup', { tempo: 5, tip: '반동 없이, 어깨 먼저 내리고 당기기' }),
      N('친업', 4, 'chinup', { tempo: 5, tip: '반동 없이, 어깨 먼저 내리고 당기기' }),
    ],
  },
  {
    id: 'push', group: '팔굽혀펴기', rest: 90, start: 1,
    levels: [
      N('팔굽혀펴기', [15, 10, 8], 'pushup', { tip: '머리부터 발목까지 일직선' }),
      N('팔굽혀펴기', [15, 12, 10], 'pushup', { tip: '머리부터 발목까지 일직선' }),
      N('팔굽혀펴기', [18, 12, 10], 'pushup', { tip: '머리부터 발목까지 일직선' }),
      N('팔굽혀펴기', [18, 15, 12], 'pushup', { tip: '머리부터 발목까지 일직선' }),
      N('팔굽혀펴기', [20, 15, 12], 'pushup', { tip: '머리부터 발목까지 일직선' }),
      N('팔굽혀펴기', [20, 18, 15], 'pushup', { tip: '머리부터 발목까지 일직선' }),
      N('팔굽혀펴기', [25, 20, 15], 'pushup', { tip: '머리부터 발목까지 일직선' }),
    ],
  },
  {
    id: 'squat', group: '스쿼트', rest: 60, start: 1,
    levels: [
      N('의자 스쿼트', 10, 'chairsquat', { tip: '엉덩이를 뒤로, 의자에 살짝만' }),
      N('의자 스쿼트', 15, 'chairsquat', { tip: '엉덩이를 뒤로, 의자에 살짝만' }),
      N('맨몸 스쿼트', 12, 'squat', { tip: '무릎은 발끝 방향, 뒤꿈치는 바닥에' }),
      N('맨몸 스쿼트', 15, 'squat', { tip: '무릎은 발끝 방향, 뒤꿈치는 바닥에' }),
      N('맨몸 스쿼트', 20, 'squat', { tip: '무릎은 발끝 방향, 뒤꿈치는 바닥에' }),
      N('3초 내려가는 스쿼트', 15, 'slowsquat', { tempo: 6, tip: '셋을 세며 천천히 내려가기' }),
    ],
  },
  {
    id: 'dip', group: '딥스', rest: 60, start: 1, cue: '팔꿈치 90도까지만',
    levels: [
      H('딥스 버티기', 15, 'dipshold', { tip: '어깨를 눌러 목을 길게' }),
      H('딥스 버티기', 20, 'dipshold', { tip: '어깨를 눌러 목을 길게' }),
      H('딥스 버티기', 30, 'dipshold', { tip: '어깨를 눌러 목을 길게' }),
      N('네거티브 딥스', 3, 'negdip', { tempo: 10, tip: '3초 동안 천천히, 팔꿈치 90도까지만' }),
      N('네거티브 딥스', 5, 'negdip', { tempo: 10, tip: '3초 동안 천천히, 팔꿈치 90도까지만' }),
      N('딥스', 3, 'dip', { tempo: 5, tip: '팔꿈치 90도까지만, 어깨 으쓱 금지' }),
      N('딥스', 5, 'dip', { tempo: 5, tip: '팔꿈치 90도까지만, 어깨 으쓱 금지' }),
      N('딥스', 8, 'dip', { tempo: 5, tip: '팔꿈치 90도까지만, 어깨 으쓱 금지' }),
    ],
  },
  {
    id: 'leg', group: '다리 들기', rest: 60, start: 1,
    levels: [
      H('무릎 들고 버티기', 15, 'kneehold', { tip: '등·허리는 등받이에 붙인 채' }),
      H('무릎 들고 버티기', 20, 'kneehold', { tip: '등·허리는 등받이에 붙인 채' }),
      N('무릎 올리기', 8, 'kneeraise', { tip: '반동 없이 천천히' }),
      N('무릎 올리기', 12, 'kneeraise', { tip: '반동 없이 천천히' }),
      N('다리 펴고 올리기', 6, 'legraise', { tempo: 5, tip: '허리가 등받이에서 뜨지 않게' }),
      N('다리 펴고 올리기', 10, 'legraise', { tempo: 5, tip: '허리가 등받이에서 뜨지 않게' }),
      H('L자 버티기', 10, 'lsit', { tip: '다리를 펴고 엉덩이 높이로' }),
    ],
  },
];

// 자전거: main = 메인 시간(분), tier = 세게 하는 정도(1~4, 루틴마다 세게 하는 시간이 길어진다)
export const BIKE = {
  id: 'bike', group: '자전거', start: 1,
  levels: [
    { main: 12, tier: 1 },
    { main: 14, tier: 1 },
    { main: 16, tier: 2 },
    { main: 18, tier: 2 },
    { main: 18, tier: 3 },
    { main: 20, tier: 3 },
    { main: 20, tier: 4 },
  ],
};

// 웜업: 편하게 2분 → 저항을 올리며 3분. 심박은 1~2분 늦게 따라오니 숫자보다 느낌(숨차는 정도)으로.
export const BIKE_WARM = { easy: 120, build: 180 };
export const HR = { easyMax: 100, build: [95, 110], target: [105, 120], light: [105, 110], hard: [125, 135], max: 140 };

// 자전거 루틴 — 자전거 날마다 인터벌 → 피라미드 → 빠르게 돌리기 차례로. 꾸준히는 골라서만.
//   interval cycle[tier] = [세게 초, 편하게 초] · speed cycle[tier] = [빠르게 초, 편하게 초]
//   pyramid steps[tier] = 기본 저항에서 몇 단계 올리는지 (최대 +3 — 무거운 저항은 혈압을 크게 올린다)
export const BIKE_ROUTINES = {
  interval: { name: '인터벌', how: '세게 ↔ 편하게 반복', cycle: [[60, 120], [90, 120], [90, 90], [120, 120]] },
  pyramid: { name: '피라미드', how: '저항을 한 단계씩 올렸다가 내리기', steps: [[0, 1, 2, 1, 0], [0, 1, 2, 3, 2, 1, 0], [0, 1, 2, 3, 3, 2, 1, 0], [0, 1, 2, 3, 3, 3, 2, 1, 0]] },
  speed: { name: '빠르게 돌리기', how: '저항은 그대로, 짧게 빠르게 돌리기', cycle: [[30, 90], [30, 60], [40, 60], [45, 60]] },
  steady: { name: '꾸준히', how: '심박 105~120을 유지하며 일정하게' },
};
export const BIKE_ROTATION = ['interval', 'pyramid', 'speed'];

export const WARMUP_STRENGTH = [
  { name: '어깨 돌리기', sec: 40, pose: 'armcircle', say: '어깨 돌리기 40초. 앞으로 크게, 뒤로 크게' },
  { name: '팔목·발목 돌리기', sec: 40, pose: null, say: '팔목, 발목 돌리기 40초' },
  { name: '제자리 걷기', sec: 100, pose: 'march', say: '제자리 걷기 1분 40초. 무릎을 번갈아 들고, 팔은 가볍게 흔드세요' },
];

export const COOLDOWN_STRENGTH = [
  { name: '가슴 스트레칭', sec: 60, pose: 'st_chest', say: '가슴 스트레칭. 기둥을 잡고 몸을 반대로, 좌우 30초씩' },
  { name: '광배근·어깨 스트레칭', sec: 60, pose: 'st_lat', say: '광배근 스트레칭. 기둥을 잡고 엉덩이를 뒤로' },
  { name: '종아리 스트레칭', sec: 60, pose: 'st_calf', say: '종아리 스트레칭. 뒤꿈치를 바닥에, 좌우 30초씩' },
];

export const COOLDOWN_BIKE = [
  { name: '종아리 스트레칭', sec: 60, pose: 'st_calf', say: '종아리 스트레칭. 뒤꿈치를 바닥에, 좌우 30초씩' },
  { name: '허벅지 앞 스트레칭', sec: 60, pose: 'st_quad', say: '허벅지 앞 스트레칭. 기둥을 잡고, 좌우 30초씩' },
];
export const BIKE_COOL_RIDE = 120;

export function exercise(id) {
  return STRENGTH.find((e) => e.id === id) || (id === 'bike' ? BIKE : null);
}

export function levelOf(id, lv) {
  const ex = exercise(id);
  return ex.levels[Math.max(1, Math.min(lv, ex.levels.length)) - 1];
}

export function maxLevel(id) {
  return exercise(id).levels.length;
}

// 그 세트의 목표 횟수 (세트별 목표면 그 세트 것, 세트가 더 많으면 마지막 것)
export function repsFor(l, setNo = 1) {
  return Array.isArray(l.reps) ? l.reps[Math.min(setNo, l.reps.length) - 1] : l.reps;
}

// 횟수 종목의 자동 진행 제한시간
export function limitSec(l, setNo = 1) {
  return repsFor(l, setNo) * l.tempo + 10;
}

export function targetText(l) {
  if (l.main != null) return `${l.main}분 · 강도 ${l.tier}`;
  if (l.type === 'hold') return `${l.sec}초`;
  return Array.isArray(l.reps) ? `${l.reps.join('·')}회` : `${l.reps}회`;
}

// 하루 계획 표시: 세트마다 같으면 "8회 × 3", 세트별이면 "15·10·8회"
export function planText(l, sets = SETS) {
  return Array.isArray(l.reps) ? targetText(l) : `${targetText(l)} × ${sets}`;
}
