// 3D 동작 데이터. 렌더러(rig.js)는 이 데이터를 읽어 움직인다. 순수 데이터라 테스트 가능.
//
// 동작 = { id, name, eq(기구), tg·dist·view(카메라), anc·at(어디에 고정), setup, breath,
//          ok:{ dur, fr:[[시각0~1, 관절각도, 단계설명]...], c:[설명] }, ng:{...} }
// 설명 c = [관절, 제목, 보조설명, 측정값, 강조할 관절들]

const GRIP = { type: 'mid', a: 'gp1', b: 'gp-1' };
const TOES = { type: 'mid', a: 'toe1', b: 'toe-1' };
const BALLS = { type: 'mid', a: 'ball1', b: 'ball-1' };
const BAR = [0, 2.2, 0.16];
const SH = ['sh1', 'sh-1'], EL = ['el1', 'el-1'], WR = ['wr1', 'wr-1'], HP = ['hp1', 'hp-1'], KN = ['kn1', 'kn-1'], AN = ['an1', 'an-1'];
const EAR = ['ear'];
const ELB = ['ang', 'sh', 'el', 'wr', '팔꿈치'];
const KNEE = ['ang', 'hip', 'kn', 'an', '무릎'];
const HIPA = ['ang', 'c7', 'hip', 'kn', '고관절'];
const BODY = ['line'];
const BREATH_NG = ['head', '숨 참기', '혈압이 순간 급상승'];

const HANG = { sf: 178, sa: 13, ef: 2, wf: 0, hf: 3, kf: 5, pf: 24, hr: 4 };
const ACT = { ...HANG, el: -0.025, sp: -2 };
const LOOSE = { ...HANG, el: 0.05 };
const SHRUG = { ...HANG, el: 0.095, nk: 20, sp: 7 };
const TOP = { sf: 10, sa: 18, ef: 150, el: -0.02, hf: 20, kf: 40, pf: 20, nk: -6 };

const PUSH_UP = { rx: 73.5, pf: -12, fla: 45 }, PUSH_DN = { rx: 83, pf: -4, fla: 45 };
const PUSH_NG_UP = { rx: 68, hf: -14, sp: -9, nk: 38, pf: -12, fla: 86 }, PUSH_NG_DN = { rx: 78, hf: -16, sp: -10, nk: 44, pf: -4, fla: 86 };

const STAND = { ha: 10, hr: 14, flat: 1, sf: 88, sa: 8, ef: 4 };
const CHAIR_DN = { rx: 35, hf: 125, kf: 96, ha: 12, hr: 14, flat: 1, sf: 122, sa: 8, ef: 4, nk: -12 };
const SQ_DN = { rx: 38, hf: 128, kf: 100, ha: 12, hr: 14, flat: 1, sf: 125, sa: 8, ef: 4, nk: -12 };
const SQ_NG_ST = { ha: 6, hr: 4, flat: 1, sf: 88, sa: 8, ef: 4 };
const SQ_NG_DN = { rx: 18, hf: 108, kf: 132, ha: 4, hr: 2, kv: 13, flat: 1, pf: 30, sf: 100, sa: 8, ef: 4, sp: 12, oz: 0.07 };

const DIP_STAND = { el: 0.03, sf: -24, sa: 10, ef: 74, wf: -12, flat: 1 };
const DIP_UP = { el: -0.025, sp: 5, rx: 5, sf: -2, sa: 9, ef: 7, wf: -8, hf: 18, kf: 78, pf: 22 };
const DIP_DN = { el: -0.01, sp: 8, rx: 18, sf: -55, sa: 12, ef: 92, wf: -15, hf: 22, kf: 78, pf: 22 };
const DIP_NG = { el: 0.1, nk: 22, sp: -6, rx: -8, sf: -6, sa: 9, ef: -12, wf: -30, hf: 30, kf: 55, pf: 20 };
const DIP_NG_DEEP = { el: 0.07, pr: 0.05, nk: 18, rx: 25, sf: -82, sa: 12, ef: 128, wf: -25, hf: 30, kf: 80, pf: 20 };

const VKR = { el: -0.01, sf: 0, sa: 7, ef: 90, pf: 22 };
const VKR_KNEE = { ...VKR, sp: -2, hf: 92, kf: 86, pf: 18 };
const VKR_LEG = { ...VKR, sp: -4, hf: 85, kf: 4, pf: 20 };
const VKR_NG = { el: 0.085, nk: 12, sf: 0, sa: 7, ef: 90, hf: -12, kf: 12, pf: 25 };

const BIKE_P = { rx: 22, nk: -12, el: -0.01, sa: 10 };

// 제자리 걷기: 서 있는 다리는 곧게(엉덩이 높이 고정), 든 다리 반대쪽 팔이 앞으로
const MARCH_HIP = 0.873;
const MARCH_MID = { sf: 4, ef: 70, sa: 8 };
const marchUp = (up, arm) => ({ ...MARCH_MID, ['hf' + up]: 68, ['kf' + up]: 82, ['pf' + up]: 18, ['sf' + arm]: 34, ['ef' + arm]: 80, ['sf' + up]: -22, ['ef' + up]: 62 });

const tower = (extra) => ({ eq: ['tower', 'stepF'], tg: [0, 1.2, 0.14], dist: 4.9, anc: GRIP, at: BAR, ...extra });
const hangNg = {
  dur: 3000,
  fr: [[0, { ...SHRUG, rx: -9, hf: -8, kf: 35, pf: 30 }], [0.5, { ...SHRUG, rx: 10, hf: 30, kf: 10, pf: 20 }], [1, { ...SHRUG, rx: -9, hf: -8, kf: 35, pf: 30 }]],
  c: [['acr1', '어깨가 귀에 붙음', '어깨 인대에 체중이 그대로 걸림', EAR, SH], ['hip', '몸을 앞뒤로 흔들기', '반동이 어깨·손목에 충격', null, HP], BREATH_NG, ['ball1', '바에서 뛰어내리기', '발목 착지 충격', null, AN]],
};
const pushNg = (up, dn) => ({
  dur: 3000, fr: [[0, up], [0.45, dn], [0.55, dn], [1, up]],
  c: [['hip', '허리가 처짐', '허리(요추)에 부담', BODY, HP], ['el', '팔꿈치를 옆으로 활짝 벌림', '어깨 앞쪽이 끼임', ['flare'], [...EL, ...SH]], ['head', '고개를 떨굼', '목에 부담'], ['c7', '숨 참고 빠르게 반복', '혈압 상승']],
});
const squatNg = {
  dur: 4200, fr: [[0, SQ_NG_ST], [0.12, SQ_NG_ST], [0.26, SQ_NG_DN], [0.62, SQ_NG_DN], [1, SQ_NG_ST]],
  c: [['heel1', '뒤꿈치가 들림', '발목·아킬레스건 부담', null, AN], ['kn', '무릎이 발끝보다 훨씬 앞', '무릎 앞쪽에 체중 집중', ['kneeToe'], KN], ['hip', '무릎이 안쪽으로 모임', '정면 보기로 확인', null, HP], ['c7', '등이 둥글게 말림', '허리 부담']],
};
const dipNg = {
  dur: 3000, fr: [[0, DIP_UP], [0.15, DIP_UP], [0.4, DIP_NG_DEEP], [0.6, DIP_NG_DEEP], [1, DIP_UP]],
  c: [['el', '90°보다 깊이 내려감', '어깨 앞쪽 인대가 늘어남', ELB, EL], ['acr1', '어깨가 앞으로 말리고 올라감', '어깨 부상 위험', EAR, SH], BREATH_NG],
};
const vkrNg = (raise) => ({
  dur: 2600, backAnchor: true,
  fr: [[0, VKR_NG], [0.35, { ...VKR_NG, nk: 18, rx: -24, sp: -4, sf: 22, ef: 72, ...raise }], [0.7, { ...VKR_NG, rx: -8, sf: 8, ef: 84, hf: -18, kf: 20 }], [1, VKR_NG]],
  c: [['kn', '반동으로 다리 차올리기', '복근 대신 반동만 씀', null, KN], ['lback', '허리가 등받이에서 떨어짐', '허리에 부담', ['hipGap'], HP], ['acr1', '어깨 으쓱', '어깨에 체중이 걸림', EAR, SH], BREATH_NG],
});
const vkr = (extra) => ({ eq: ['tower', 'stepF'], tg: [0, 1.15, -0.05], dist: 4, anc: { type: 'elbows' }, at: [0, 1.27, -0.17], setup: 'backPad', ...extra });

export const POSES = {
  deadhang: tower({
    name: '데드행', breath: true,
    ok: {
      dur: 9000,
      fr: [[0, LOOSE, '① 발판을 딛고 바를 잡는다 — 엄지까지 감싸 쥐기'], [0.1, LOOSE, '② 어깨를 아래로 끌어내린다 — 몸 전체가 살짝 올라간다'], [0.22, ACT, '③ 버티는 내내 숨쉬기'], [0.86, ACT, '④ 발판을 딛고 천천히 내려온다'], [1, LOOSE]],
      c: [['acr1', '어깨를 귀에서 멀리', '목이 길게 보이게', EAR, SH], ['gp1', '엄지까지 감싸 쥐기', '손은 어깨보다 조금 넓게', null, WR], ['navel', '배에 살짝 힘', '다리 모으고 흔들지 않기'], ['ball1', '끝나면 발판 딛고 내려오기', '뛰어내리기 금지 — 발목 보호', null, AN]],
    },
    ng: hangNg,
  }),
  scappull: tower({
    name: '스캐풀라 풀업',
    ok: {
      dur: 4200,
      fr: [[0, LOOSE, '① 매달린 채 팔은 쭉 편다'], [0.15, LOOSE, '② 팔은 편 채 어깨만 아래로 — 몸이 몇 cm 올라간다'], [0.38, { ...ACT, el: -0.04, sp: -4 }, '③ 1초 멈춤'], [0.58, { ...ACT, el: -0.04, sp: -4 }, '④ 천천히 어깨를 다시 올린다'], [0.85, LOOSE], [1, LOOSE]],
      c: [['acr1', '어깨만 아래로 끌어내리기', '팔은 편 채로', EAR, SH], ['el', '팔꿈치는 펴진 채로', '팔로 당기지 않기', ELB, EL], ['navel', '몸은 흔들지 않기', '배에 살짝 힘']],
    },
    ng: {
      dur: 2400, fr: [[0, SHRUG], [0.5, { ...SHRUG, el: 0.06, sf: 158, ef: 48 }], [1, SHRUG]],
      c: [['el', '팔꿈치를 굽혀 당김', '어깨 대신 팔을 씀', ELB, EL], ['acr1', '어깨 으쓱', '어깨 인대에 부담', EAR, SH], BREATH_NG],
    },
  }),
  negchin: tower({
    name: '네거티브 친업',
    ok: {
      dur: 9000,
      fr: [[0, TOP, '① 발판을 딛고 턱을 바 위로 올린 자세에서 시작'], [0.08, TOP, '② 5초 동안 천천히 내려온다'], [0.62, ACT, '③ 끝까지 내려와도 어깨는 내린 채'], [0.75, ACT, '④ 발판을 딛고 다시 올라간다'], [1, TOP]],
      c: [['head', '턱이 바 위에서 시작', '발판을 딛고 올라가기'], ['el', '5초 동안 천천히 펴기', '팔꿈치 각도가 서서히 커짐', ELB, EL], ['acr1', '내려와서도 어깨는 내린 채', '귀에서 멀리', EAR, SH]],
    },
    ng: {
      dur: 2600, fr: [[0, TOP], [0.15, TOP], [0.3, SHRUG], [0.9, SHRUG], [1, TOP]],
      c: [['el', '툭 떨어지듯 내려옴', '팔꿈치·어깨 힘줄에 충격', ELB, EL], ['acr1', '바닥에서 어깨가 귀에 붙음', '어깨 인대 부담', EAR, SH], BREATH_NG],
    },
  }),
  chinup: tower({
    name: '친업',
    ok: {
      dur: 4200,
      fr: [[0, ACT, '① 어깨를 먼저 내린다'], [0.12, { ...ACT, el: -0.035 }, '② 가슴을 바 쪽으로 당겨 턱이 바 위로'], [0.42, TOP, '③ 잠깐 멈춤'], [0.52, TOP, '④ 2초 동안 천천히 내려온다'], [1, ACT]],
      c: [['acr1', '어깨 먼저 내리고 당기기', '으쓱하지 않기', EAR, SH], ['el', '끝까지 내려와 팔을 편다', '반만 하지 않기', ELB, EL], ['navel', '다리는 모으고 반동 없이', '몸 흔들지 않기']],
    },
    ng: {
      dur: 2300, fr: [[0, { ...SHRUG, rx: -8, hf: -15, kf: 40 }], [0.4, { ...TOP, nk: -28, rx: 8, hf: 62, kf: 20 }], [1, { ...SHRUG, rx: -8, hf: -15, kf: 40 }]],
      c: [['hip', '다리 반동으로 올라감', '허리·어깨에 충격', null, HP], ['head', '턱만 내밀어 바를 넘김', '목에 부담'], ['acr1', '매달릴 때 어깨가 풀림', '어깨 인대 부담', EAR, SH]],
    },
  }),
  pushup: {
    name: '팔굽혀펴기', eq: ['mat'], tg: [0, 0.32, -0.25], dist: 3.4, anc: TOES, at: [0, 0, -0.98], push: { y: 0.06 },
    ok: {
      dur: 3800, fr: [[0, PUSH_UP, '① 머리부터 발목까지 일직선으로'], [0.12, PUSH_UP, '② 들이쉬며 가슴을 바닥 가까이'], [0.5, PUSH_DN, '③ 잠깐 멈춤'], [0.62, PUSH_DN, '④ 내쉬며 밀어 올리기'], [1, PUSH_UP]],
      c: [['hip', '머리~발목 일직선', '엉덩이·배에 힘', BODY, HP], ['el', '팔꿈치는 몸 쪽으로', '몸통과 45° 이내로 모으기', ['flare'], [...EL, ...SH]], ['wr', '손은 어깨 바로 아래', '손목 아프면 주먹 쥐기', null, WR], ['head', '목은 몸과 일직선', '시선은 손보다 약간 앞 바닥']],
    },
    ng: pushNg(PUSH_NG_UP, PUSH_NG_DN),
  },
  chairsquat: {
    name: '의자 스쿼트', eq: ['chair'], tg: [0, 0.72, -0.12], dist: 3.6, anc: BALLS, plant: true, at: [0, 0, 0.24], setup: 'chairUnderHip',
    ok: {
      dur: 5200, ref: 0.5,
      fr: [[0, STAND, '① 발은 어깨너비, 발끝은 살짝 바깥'], [0.1, STAND, '② 엉덩이를 뒤로 빼며 천천히 앉기'], [0.45, CHAIR_DN, '③ 의자에 살짝 닿으면 멈춤'], [0.58, CHAIR_DN, '④ 발뒤꿈치로 바닥을 밀며 일어나기'], [1, STAND]],
      c: [['hip', '엉덩이를 뒤로 빼며 앉기', '의자에는 살짝만 닿기', null, HP], ['kn', '무릎은 발끝 방향', '발끝을 크게 넘지 않기', KNEE, KN], ['heel1', '뒤꿈치는 바닥에', '뒤꿈치로 밀며 일어나기', null, AN], ['c7', '가슴 펴고 등은 곧게', '허리를 말지 않기']],
    },
    ng: squatNg,
  },
  squat: {
    name: '맨몸 스쿼트', eq: [], tg: [0, 0.72, -0.05], dist: 3.6, anc: BALLS, plant: true, at: [0, 0, 0.24],
    ok: {
      dur: 3800, fr: [[0, STAND, '① 발은 어깨너비, 발끝은 살짝 바깥'], [0.1, STAND, '② 엉덩이를 뒤로 빼며 앉기'], [0.45, SQ_DN, '③ 허벅지가 바닥과 평행'], [0.55, SQ_DN, '④ 뒤꿈치로 밀며 일어나기'], [1, STAND]],
      c: [['hip', '엉덩이를 뒤로 빼며 앉기', '허벅지가 바닥과 평행까지', null, HP], ['kn', '무릎은 발끝 방향', '발끝을 크게 넘지 않기', KNEE, KN], ['heel1', '뒤꿈치는 바닥에', '뒤꿈치로 밀며 일어나기', null, AN], ['c7', '가슴 펴고 등은 곧게', '허리를 말지 않기']],
    },
    ng: squatNg,
  },
  slowsquat: {
    name: '3초 내려가는 스쿼트', eq: [], tg: [0, 0.72, -0.05], dist: 3.6, anc: BALLS, plant: true, at: [0, 0, 0.24],
    ok: {
      dur: 5600, fr: [[0, STAND, '① 발은 어깨너비'], [0.08, STAND, '② 하나, 둘, 셋 — 3초 동안 내려가기'], [0.62, SQ_DN, '③ 바닥에서 잠깐 멈춤'], [0.7, SQ_DN, '④ 1초에 일어나기'], [0.9, STAND], [1, STAND]],
      c: [['hip', '천천히 일정한 속도로', '중간에 멈칫하지 않기', null, HP], ['kn', '무릎은 발끝 방향', '안쪽으로 모이지 않게', KNEE, KN], ['heel1', '뒤꿈치는 바닥에', '끝까지 붙인 채', null, AN]],
    },
    ng: squatNg,
  },
  dipshold: {
    name: '딥스 버티기', eq: ['tower', 'stepD'], tg: [0, 1.25, 0.02], dist: 4, anc: GRIP, at: [0, 1.22, 0.11], setup: 'stepUnderFeet', breath: true,
    ok: {
      dur: 9000, fr: [[0, DIP_STAND, '① 발판을 딛고 손잡이를 잡는다 — 손목은 팔뚝과 일직선'], [0.12, DIP_STAND, '② 팔을 펴며 몸을 들어 올린다'], [0.24, DIP_UP, '③ 어깨를 내리고 버티며 숨쉬기'], [0.86, DIP_UP, '④ 발판으로 천천히 내려온다'], [1, DIP_STAND]],
      c: [['acr1', '어깨를 아래로 눌러 목을 길게', '귀까지 올라가지 않게', EAR, SH], ['el', '팔은 펴되 잠그지 않기', '팔꿈치를 살짝 굽힌 채로', ELB, EL], ['wr', '손목과 팔뚝을 일직선', '손목을 뒤로 꺾지 않기', null, WR], ['kn', '다리는 모아서 고정', '흔들지 않기', null, KN]],
    },
    ng: {
      dur: 3000, fr: [[0, DIP_NG], [0.5, { ...DIP_NG, hf: -12, kf: 95 }], [1, DIP_NG]],
      c: [['acr1', '어깨가 귀까지 올라감', '어깨 부상 1순위', EAR, SH], ['el', '팔꿈치를 뒤로 꺾어 잠금', '관절에 체중이 실림', ['text', '뒤로 꺾임'], EL], ['wr', '손목이 뒤로 꺾임', '손목 통증', null, WR], BREATH_NG],
    },
  },
  negdip: {
    name: '네거티브 딥스', eq: ['tower', 'stepD'], tg: [0, 1.2, 0.02], dist: 4, anc: GRIP, at: [0, 1.22, 0.11], setup: 'stepUnderFeet',
    ok: {
      dur: 8000, fr: [[0, DIP_UP, '① 발판에서 올라가 팔을 편 자세'], [0.08, DIP_UP, '② 3초 동안 천천히 내려간다'], [0.48, DIP_DN, '③ 팔꿈치 90°에서 발판을 딛는다'], [0.66, DIP_STAND, '④ 발판을 딛고 다시 위로'], [0.86, DIP_UP], [1, DIP_UP]],
      c: [['el', '팔꿈치 90°까지만', '더 깊이 내려가지 않기', ELB, EL], ['acr1', '어깨 으쓱 금지', '귀에서 멀리', EAR, SH], ['chest', '상체는 살짝 앞으로', '어깨 앞쪽 보호']],
    },
    ng: dipNg,
  },
  dip: {
    name: '딥스', eq: ['tower'], tg: [0, 1.2, 0.02], dist: 4, anc: GRIP, at: [0, 1.22, 0.11],
    ok: {
      dur: 4200, fr: [[0, DIP_UP, '① 위에서 팔을 편 자세, 어깨는 내린 채'], [0.1, DIP_UP, '② 상체를 살짝 숙이며 천천히 내려간다'], [0.45, DIP_DN, '③ 팔꿈치 90°에서 멈춤'], [0.55, DIP_DN, '④ 밀어 올린다'], [1, DIP_UP]],
      c: [['el', '팔꿈치 90°까지만', '더 깊이 내려가지 않기', ELB, EL], ['acr1', '어깨 으쓱 금지', '귀에서 멀리', EAR, SH], ['chest', '상체는 살짝 앞으로', '어깨 앞쪽 보호']],
    },
    ng: dipNg,
  },
  kneehold: vkr({
    name: '무릎 들고 버티기', breath: true,
    ok: {
      dur: 9000, fr: [[0, VKR, '① 등은 등받이에, 팔뚝은 팔걸이에 올린다'], [0.12, VKR, '② 무릎을 엉덩이 높이까지 천천히'], [0.28, VKR_KNEE, '③ 버티며 숨쉬기 — 허리는 등받이에'], [0.86, VKR_KNEE, '④ 천천히 내린다'], [1, VKR]],
      c: [['back', '등·허리를 등받이에', '붙인 채로 유지'], ['acr1', '어깨 으쓱 금지', '팔뚝으로 체중 지지', EAR, SH], ['kn', '무릎은 엉덩이 높이까지', '반동 없이 천천히', HIPA, [...HP, ...KN]], ['navel', '배꼽을 등 쪽으로', '당기며 숨쉬기']],
    },
    ng: vkrNg({ hf: 118, kf: 40, pf: 10 }),
  }),
  kneeraise: vkr({
    name: '무릎 올리기',
    ok: {
      dur: 4200, fr: [[0, VKR, '① 등은 등받이에'], [0.1, VKR, '② 무릎을 엉덩이 높이까지 천천히'], [0.45, VKR_KNEE, '③ 1초 멈춤'], [0.55, VKR_KNEE, '④ 천천히 내린다'], [1, VKR]],
      c: [['back', '등·허리를 등받이에', '붙인 채로 유지'], ['kn', '무릎은 엉덩이 높이까지', '반동 없이 천천히', HIPA, [...HP, ...KN]], ['acr1', '어깨 으쓱 금지', '팔뚝으로 체중 지지', EAR, SH]],
    },
    ng: vkrNg({ hf: 118, kf: 40, pf: 10 }),
  }),
  legraise: vkr({
    name: '다리 펴고 올리기',
    ok: {
      dur: 5200, fr: [[0, VKR, '① 등은 등받이에, 다리는 모아서'], [0.1, VKR, '② 다리를 편 채 천천히 올린다'], [0.45, VKR_LEG, '③ 허리가 뜨기 전까지만'], [0.55, VKR_LEG, '④ 천천히 내린다'], [1, VKR]],
      c: [['lback', '허리를 등받이에 붙인 채', '허리가 뜨면 거기까지만', null, HP], ['kn', '다리를 펴고 천천히', '반동 없이', HIPA, [...HP, ...KN]], ['acr1', '어깨 으쓱 금지', '팔뚝으로 체중 지지', EAR, SH]],
    },
    ng: vkrNg({ hf: 112, kf: 6, pf: 10 }),
  }),
  lsit: vkr({
    name: 'L자 버티기', breath: true,
    ok: {
      dur: 9000, fr: [[0, VKR, '① 등은 등받이에'], [0.12, VKR, '② 다리를 편 채 엉덩이 높이로'], [0.3, { ...VKR_LEG, hf: 88, sp: -6 }, '③ 버티며 숨쉬기'], [0.86, { ...VKR_LEG, hf: 88, sp: -6 }, '④ 천천히 내린다'], [1, VKR]],
      c: [['kn', '다리를 펴고 엉덩이 높이로', '힘들면 무릎을 살짝 굽혀도 됨', HIPA, [...HP, ...KN]], ['acr1', '어깨 으쓱 금지', '팔뚝으로 체중 지지', EAR, SH], ['navel', '배에 힘, 숨은 계속', '숨 참지 않기']],
    },
    ng: {
      dur: 3000, backAnchor: true, fr: [[0, { ...VKR_NG, hf: 75, kf: 30, sp: 12 }], [0.5, { ...VKR_NG, hf: 60, kf: 45, sp: 14, rx: -10 }], [1, { ...VKR_NG, hf: 75, kf: 30, sp: 12 }]],
      c: [['acr1', '어깨 으쓱', '어깨에 체중이 걸림', EAR, SH], ['c7', '등이 둥글게 말림', '허리에 부담'], BREATH_NG],
    },
  }),
  bike: {
    name: '실내 자전거', eq: ['bike'], bike: true, tg: [0, 0.85, 0.1], dist: 3.5, view: 90, anc: { type: 'root' }, at: [0, 1.0, -0.13], pole: [0.5, -1, -0.1],
    ok: {
      dur: 1400, lin: true, fr: [[0, { ...BIKE_P, crank: 0, hw: [0.21, 1.1, 0.47] }, '페달 맨 아래에서 무릎이 살짝 굽어 있으면 안장 높이가 맞습니다'], [1, { ...BIKE_P, crank: 360, hw: [0.21, 1.1, 0.47] }]],
      c: [['kn', '페달 맨 아래에서 무릎 살짝 굽힘', '25~35°가 적당', ['bend', '무릎 굽힘'], KN], ['hip', '골반은 안장 위에 고정', '좌우로 흔들리지 않게', null, HP], ['el', '어깨 힘 빼고 팔꿈치 살짝 굽힘', '손잡이를 꽉 쥐지 않기', null, EL], ['ball1', '발 앞쪽으로 페달 밟기', '발목 부담 줄이기', null, AN]],
    },
    ng: {
      dur: 1400, lin: true, saddleDrop: 0.08, at: [0, 0.92, -0.13],
      fr: [[0, { ...BIKE_P, rx: 30, el: 0.06, nk: 5, crank: 0, hw: [0.21, 1.1, 0.47] }], [1, { ...BIKE_P, rx: 30, el: 0.06, nk: 5, crank: 360, hw: [0.21, 1.1, 0.47] }]],
      c: [['kn', '안장이 낮아 무릎이 많이 굽음', '무릎 앞쪽 부담', ['bend', '무릎 굽힘'], KN], ['acr1', '어깨 으쓱', '목·어깨 뭉침', EAR, SH], ['hip', '안장이 너무 높아도 문제', '골반이 흔들려 허리·발목 부담', null, HP]],
    },
  },
  march: {
    name: '제자리 걷기', eq: [], tg: [0, 0.95, 0], dist: 4.4, view: 62, anc: { type: 'root' }, at: [0, MARCH_HIP, 0],
    ok: {
      dur: 1500,
      fr: [[0, MARCH_MID, '① 등을 펴고 무릎을 번갈아 들기'], [0.25, marchUp('L', 'R')], [0.5, MARCH_MID, '② 팔은 반대쪽으로 가볍게 흔들기'], [0.75, marchUp('R', 'L')], [1, MARCH_MID]],
      c: [['kn', '무릎을 엉덩이 높이 가까이', '힘들면 낮게 들어도 괜찮음', null, KN], ['ball1', '발 앞쪽으로 사뿐히 딛기', '쿵쿵 딛지 않기 — 발목 보호', null, AN], ['c7', '등은 곧게, 시선은 앞', '허리를 뒤로 젖히지 않기'], ['el', '팔은 반대로 가볍게 흔들기', '어깨 힘 빼기', null, EL]],
    },
  },
  armcircle: {
    name: '어깨 돌리기', eq: [], tg: [0, 1.05, 0], dist: 4.6, view: 30, anc: BALLS, at: [0, 0, 0.1],
    ok: {
      dur: 1600, lin: true,
      fr: [[0, { flat: 1, sa: 86, sf: 0, ef: 6 }, '팔을 옆으로 펴고 작게 원을 그리다 점점 크게'], [0.25, { flat: 1, sa: 96, sf: 16, ef: 6 }], [0.5, { flat: 1, sa: 106, sf: 0, ef: 6 }], [0.75, { flat: 1, sa: 96, sf: -16, ef: 6 }], [1, { flat: 1, sa: 86, sf: 0, ef: 6 }]],
      c: [['acr1', '어깨를 크게 돌리기', '앞으로 10번, 뒤로 10번', null, SH]],
    },
  },
  st_chest: {
    name: '가슴 스트레칭', eq: ['tower'], tg: [-0.1, 1.05, -0.2], dist: 3.8, view: -55, anc: { type: 'root' }, at: [-0.08, 0.92, -0.12], pole: [0.2, -1, 0.1],
    ok: {
      dur: 4000,
      fr: [[0, { ry: -40, sa: 10, ef: 10, akL: [0.06, 0.0925, 0.0], akR: [-0.2, 0.0925, -0.2], hwR: [-0.4, 1.4, -0.36] }, '기둥을 어깨 높이로 잡고 몸을 반대쪽으로 천천히 돌린다'], [1, { ry: -46, sa: 10, ef: 10, akL: [0.06, 0.0925, 0.0], akR: [-0.2, 0.0925, -0.2], hwR: [-0.4, 1.4, -0.36] }]],
      c: [['chest', '가슴 앞쪽이 늘어나는 느낌', '아프지 않고 시원한 정도'], ['sh-1', '손은 어깨 높이로', '좌우 30초씩', null, ['sh-1', 'el-1', 'wr-1']]],
    },
  },
  st_lat: {
    name: '광배근·어깨 스트레칭', eq: ['tower'], tg: [0, 0.9, 0.05], dist: 3.6, view: 90, anc: { type: 'root' }, at: [0, 0.9, 0.62], pole: [0.3, 0, 1],
    ok: {
      dur: 4000,
      fr: [[0, { ry: 180, rx: 72, nk: 8, akL: [0.13, 0.0925, 0.55], akR: [-0.13, 0.0925, 0.55], hwL: [0.37, 1.02, -0.38], hwR: [-0.37, 1.02, -0.38] }, '기둥을 잡고 엉덩이를 뒤로 빼며 등을 길게 늘인다'], [1, { ry: 180, rx: 80, nk: 10, akL: [0.13, 0.0925, 0.55], akR: [-0.13, 0.0925, 0.55], hwL: [0.37, 1.02, -0.38], hwR: [-0.37, 1.02, -0.38] }]],
      c: [['back', '엉덩이를 뒤로 빼며 등을 길게', '겨드랑이 아래가 늘어나는 느낌'], ['acr1', '어깨는 귀에서 멀리', '목에 힘 빼기', null, SH]],
    },
  },
  st_calf: {
    name: '종아리 스트레칭', eq: ['tower'], tg: [0, 0.75, 0.3], dist: 3.6, view: 90, anc: { type: 'root' }, at: [0, 0.86, 0.42], pole: [0.4, -1, -0.2],
    ok: {
      dur: 4000,
      fr: [[0, { ry: 180, rx: 12, akL: [0.12, 0.0925, 0.18], akR: [-0.12, 0.0925, 0.9], hwL: [0.36, 1.25, -0.38], hwR: [-0.36, 1.25, -0.38] }, '앞 무릎은 굽히고, 뒷다리는 쭉 펴서 뒤꿈치를 바닥에'], [1, { ry: 180, rx: 16, akL: [0.12, 0.0925, 0.18], akR: [-0.12, 0.0925, 0.9], hwL: [0.36, 1.25, -0.38], hwR: [-0.36, 1.25, -0.38] }]],
      c: [['heel-1', '뒤꿈치를 바닥에 붙인 채', '종아리가 늘어나는 느낌', null, ['an-1']], ['kn-1', '뒷다리 무릎은 쭉 편다', '좌우 30초씩', null, ['kn-1']]],
    },
  },
  st_quad: {
    name: '허벅지 앞 스트레칭', eq: ['tower'], tg: [0.1, 0.9, -0.15], dist: 3.6, view: 70, anc: { type: 'root' }, at: [0.18, 0.92, -0.2], holdAnkle: 'R', pole: [0.3, -1, 0],
    ok: {
      dur: 4000,
      fr: [[0, { akL: [0.27, 0.0925, -0.18], hfR: -12, kfR: 135, pfR: 30, hwL: [0.38, 1.25, -0.39] }, '기둥을 잡고 한쪽 발목을 뒤로 잡아 당긴다'], [1, { akL: [0.27, 0.0925, -0.18], hfR: -16, kfR: 140, pfR: 30, hwL: [0.38, 1.25, -0.39] }]],
      c: [['kn-1', '발목을 잡아 엉덩이 쪽으로', '허벅지 앞이 늘어나는 느낌', null, ['kn-1', 'an-1']], ['hip-1', '무릎은 바닥을 향하게', '허리를 젖히지 않기 · 좌우 30초씩', null, ['hp-1']]],
    },
  },
};

for (const [id, p] of Object.entries(POSES)) p.id = id;
