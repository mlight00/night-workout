// 조립 — 브라우저 API(시각·음성·비프음·화면 유지·저장소)를 아는 유일한 곳.

import { createTimer } from './timer.js';
import { strengthDay, bikeDay, stretchDay, totalSeconds } from './timeline.js';
import { lineFor, cuePlan } from './coach.js';
import { speak, stopSpeech, unlockSpeech } from './speech.js';
import { createBeeper, needsCountdown } from './beeps.js';
import { createStore, exportJson, importJson } from './store.js';
import { nextType, nextRoutine, ymd, isWeekend } from './schedule.js';
import { applyResults, applyCondition, levelUp, levelDown } from './levels.js';
import { makeRecord, gradeStrength, gradeBike } from './session.js';
import { addWeight, addWalk, undoWalk } from './stats.js';
import { formatClock, withRo } from './format.js';
import { createWakeLock } from './wakelock.js';
import { STRENGTH, BIKE_ROUTINES } from './program.js';
import { $, esc, show, back, home, onShow, wireBackButtons } from './ui/dom.js';
import { renderHome } from './ui/home.js';
import { openPosture, closePosture } from './ui/posture.js';
import { renderRecords } from './ui/records.js';
import { renderEnd } from './ui/end.js';
import { createViewer } from './body3d/viewer.js';

// 시계: 빨리감기 배속을 언제 바꿔도 시간이 튀지 않게 이어 붙인다 (체험 모드, ?speed=)
let speed = Math.max(1, +(new URLSearchParams(location.search).get('speed') || 1)), cBase = 0, cT0 = performance.now();
const clock = () => cBase + (performance.now() - cT0) * speed;
function setSpeed(x) { cBase = clock(); cT0 = performance.now(); speed = x; }
const today = () => ymd(new Date());

const store = createStore(safeStorage());
const beeper = createBeeper();
const wakeLock = createWakeLock();
let data = store.load();
let typeOverride = null;
let routineOverride = null; // 자전거 날 홈에서 고른 루틴 (없으면 차례대로)
let S = null; // 진행 중인 운동
let workViewer = null;
let endRec = null;

function safeStorage() {
  try { return window.localStorage; } catch { return { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } }; }
}
let demo = false; // 체험 모드: 기록을 복사본으로만 다루고 저장하지 않는다
const save = () => (demo ? true : store.save(data));
const myKg = () => (data.weights.length ? data.weights.at(-1).kg : 90);
const todayType = () => typeOverride || nextType(data.sessions);
const todayRoutine = () => routineOverride || nextRoutine(data.sessions);

// ---- 음성 ----------------------------------------------------------------
function unlockAudio() {
  beeper.unlock();
  unlockSpeech();
}

// ---- 홈 ------------------------------------------------------------------
function refreshHome() {
  renderHome({
    data, today: today(), type: todayType(), routine: todayRoutine(), legacy: store.legacyCount(),
    onWeight: (kg) => { data.weights = addWeight(data.weights, today(), kg); save(); refreshHome(); },
    onRoutine: (r) => { routineOverride = r; refreshHome(); },
    onWalk: (min) => { data.walks = addWalk(data.walks, today(), min); save(); refreshHome(); },
    onWalkUndo: () => { data.walks = undoWalk(data.walks, today()); save(); refreshHome(); },
  });
}
onShow('home', refreshHome);
$('btnSwap').onclick = () => { typeOverride = todayType() === 'strength' ? 'bike' : 'strength'; refreshHome(); };
$('btnStart').onclick = () => { unlockAudio(); renderCondition(); show('cond'); };
// 주말: 오늘은 쉬기 — 운동 차례는 그대로 다음으로 넘어간다
$('btnPass').onclick = () => {
  if (!data.sessions.some((s) => s.date === today() && s.type === 'rest')) data.sessions.push({ date: today(), type: 'rest' });
  save();
  refreshHome();
};
$('toPosture').onclick = () => { show('posture'); openPosture({ levels: data.state.levels, kg: myKg() }); };
$('toRecords').onclick = () => { show('records'); };
$('toSafety').onclick = () => show('safety');
onShow('records', () => renderRecords({
  data, demo, legacy: store.legacyCount(),
  onWeight: (kg) => { data.weights = addWeight(data.weights, today(), kg); save(); show('records', { replace: true }); },
  onExport: exportFile,
  onImport: (text) => {
    try {
      const d = importJson(text);
      if (!confirm(`운동 ${d.sessions.length}회, 체중 ${d.weights.length}개가 든 파일입니다. 지금 기록을 이 파일로 바꿀까요?`)) return '가져오기를 취소했습니다';
      data = d; save(); setTimeout(() => show('records', { replace: true }), 0);
      return '가져왔습니다';
    } catch (e) { return e.message; }
  },
}));
for (const name of ['home', 'records', 'safety', 'cond', 'end']) onShow(name, closePosture);

function exportFile() {
  const blob = new Blob([exportJson(data)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `야간운동-기록-${today()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// ---- 컨디션 → 시작 ------------------------------------------------------
function renderCondition(step = 'ask') {
  const type = todayType();
  const opt = (k, emo, title, sub) => `<button data-c="${k}"><span class="emo">${emo}</span><span>${title}<small>${sub}</small></span></button>`;
  $('condBody').innerHTML = step === 'ask'
    ? opt('good', '😀', '좋음', '계획대로') + opt('ok', '🙂', '보통', '계획대로') + opt('tired', '😮‍💨', '피곤함', type === 'strength' ? '가볍게: 2세트, 휴식 +15초' : '가볍게: 꾸준히 타기, 시간 ⅔') + opt('pain', '🤕', '아픈 곳이 있음', '오늘은 쉬기를 권합니다')
    : `<div class="banner warn">아픈 곳이 있으면 쉬는 게 회복에 가장 좋습니다.</div>` + opt('stretch', '🧘', '스트레칭만 하기', '4분, 근육 풀기') + opt('light', '🐢', '그래도 가볍게 하기', '아픈 부위는 무리하지 않기') + opt('rest', '🛌', '오늘은 쉬기', '홈으로');
  $('condBody').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const c = b.dataset.c;
    if (c === 'pain') return renderCondition('pain');
    if (c === 'rest') { data.state = applyCondition(data.state, 'pain'); save(); return home(); }
    if (c === 'stretch') return startSession('stretch', 'normal', 'pain');
    if (c === 'light') return startSession(type, 'light', 'pain');
    startSession(type, c === 'tired' ? 'light' : 'normal', c);
  };
}

function startSession(type, mode, condition) {
  unlockAudio();
  data.state = applyCondition(data.state, condition);
  save();
  const routine = type === 'bike' ? (mode === 'light' ? 'steady' : todayRoutine()) : null;
  const steps = type === 'strength' ? strengthDay(data.state.levels, mode) : type === 'bike' ? bikeDay(data.state.levels.bike.lv, mode, routine, data.state.levels.wall.lv) : stretchDay();
  S = { type, mode, condition, routine, steps, total: totalSeconds(steps), timer: createTimer(steps), ends: [], startedAt: new Date().toISOString(), beeped: new Set(), last: clock(), active: true, step: null, paused: 0 };
  typeOverride = null;
  routineOverride = null;
  wakeLock.acquire();
  show('work', { replace: true });
  handle(S.timer.start(clock()));
  S.tick = setInterval(loop, 100);
  render();
}

function loop() {
  if (!S || !S.active || S.paused) return;
  const t = clock(), gap = t - S.last;
  S.last = t;
  const catching = gap > 3000 * speed; // 화면이 꺼졌다 켜지면 밀린 안내는 건너뛴다
  if (catching) stopSpeech();
  handle(S.timer.tick(t), catching);
  if (!S || !S.active) return;
  const st = S.timer.state();
  if (needsCountdown(st.step) && st.remaining <= 3.25 && !S.beeped.has(st.index)) {
    S.beeped.add(st.index);
    beeper.countdown(st.remaining / speed);
  }
  render();
}

function handle(events, catching = false) {
  const lastStart = catching ? events.filter((e) => e.type === 'stepStart').at(-1) : null;
  for (const e of events) {
    if (!catching || e === lastStart || e.type === 'sessionEnd') speak(lineFor(e));
    if (e.type === 'stepStart') onStep(e.step, e.index);
    if (e.type === 'second' && !catching) cueOn(e);
    if (e.type === 'stepEnd') {
      S.ends.push(e);
      const next = S.steps[e.index + 1];
      if (e.reason === 'skip' && next && (next.kind === 'work' || e.step.beepEnd)) beeper.countdown(0);
    }
    if (e.type === 'sessionEnd') return finish(true);
  }
}

// 자세 포인트를 말하는 동안: 3D에서 그 부위만 표시하고 아래 글도 그 포인트로
function cueOn(e) {
  const c = cuePlan(e.step).find((x) => x.at === e.step.seconds - e.remaining);
  if (!c) return;
  S.cue = { index: e.index, title: c.title, until: c.at + 9 };
  if (workViewer) workViewer.emphasize(c.i);
}
function cueTip(st) {
  if (!S.cue) return null;
  if (S.cue.index === st.index && st.step.seconds - st.remaining < S.cue.until) return S.cue.title;
  S.cue = null;
  if (workViewer) workViewer.emphasize(null);
  return null;
}

// 단계가 바뀔 때: 3D를 켤지, 어떤 동작을 보여줄지
function onStep(step, index) {
  S.step = step;
  S.cue = null;
  // 휴식·웜업·스트레칭은 3D가 화면 가득, 운동·자전거 중엔 숫자 위에 작게
  const pose = step.kind === 'rest' ? step.next.pose : step.pose || null;
  S.mini = !!pose && (step.kind === 'work' || step.kind === 'ride');
  const w = $('screen-work');
  w.classList.toggle('show3d', !!pose && !S.mini);
  w.classList.toggle('mini3d', S.mini);
  w.className = w.className.replace(/zone-\w+/g, '').trim();
  if (step.kind === 'ride') w.classList.add(`zone-${step.zone}`);
  if (pose) {
    if (!workViewer) workViewer = createViewer($('w3d'), { zoom: 0.95, kg: myKg(), maxFps: 30 });
    workViewer.setBody(myKg());
    workViewer.setZoom(S.mini ? 1.2 : 0.95); // 작은 화면은 조금 멀리서 — 머리·기구가 잘리지 않게
    workViewer.show(pose, 'ok');
    workViewer.start();
  } else if (workViewer) workViewer.stop();
  const prev = S.steps[index - 1];
  if ((step.kind === 'warmup' || step.kind === 'cooldown' || step.kind === 'ride') && prev && !prev.beepEnd) beeper.ding();
  $('btnSkip').hidden = step.kind !== 'ride';
}

function render() {
  const st = S.timer.state(), s = st.step;
  let title = '', sub = '', tip = '', phase = '';
  if (s.kind === 'work') {
    title = `${s.name} · ${s.setNo}세트 / ${s.totalSets}`;
    sub = s.type === 'hold' ? `${s.target}초 버티기 · 숨 쉬면서` : `목표 ${s.target}회 · 다 하면 화면 탭`;
    tip = s.tip || '';
    phase = s.group;
  } else if (s.kind === 'rest') {
    const n = s.next;
    title = s.prep ? '준비' : '휴식';
    sub = `다음: ${n.name} ${n.setNo}세트 · ${n.type === 'hold' ? `${n.target}초` : `${n.target}회`}`;
    tip = n.tip || '';
    phase = n.group;
  } else if (s.kind === 'ride') {
    title = s.name;
    sub = `${s.routine === 'pyramid' ? '' : `저항 ${s.res} · `}${s.feel}
심박 ${s.hr[0] ? `${s.hr[0]}~${s.hr[1]}` : `${s.hr[1]} 이하`}`;
    phase = `자전거 · ${BIKE_ROUTINES[s.routine].name}`;
  } else {
    title = s.name;
    sub = s.kind === 'warmup' ? '웜업' : '쿨다운';
    phase = s.kind === 'warmup' ? '웜업' : '마무리';
  }
  // 더 힘든 구간 직전엔 그 예고가 자세 포인트보다 먼저
  const soon = s.kind === 'ride' && s.beepEnd && st.remaining <= 12;
  const cue = cueTip(st);
  if (soon) tip = s.upNext.zone === 'climb' ? `곧 저항 ${withRo(s.upNext.res)} 올리기` : `곧 ${s.upNext.name} — 저항 ${s.upNext.res}`;
  else if (cue) tip = cue;
  const lbl = S.mini && workViewer ? workViewer.label : '';
  if ($('wLbl').textContent !== lbl) $('wLbl').textContent = lbl;
  $('wTitle').textContent = title;
  $('wSub').textContent = sub;
  if ($('wTip').textContent !== tip) $('wTip').textContent = tip;
  $('wPhase').textContent = phase;
  const ct = formatClock(st.remaining);
  $('wClock').textContent = ct;
  $('wClock').classList.toggle('long', ct.length > 2);
  $('wClock').classList.toggle('warn', (s.kind === 'work' || s.kind === 'rest') && st.remaining <= 5);
  $('wBar').style.width = `${Math.min(100, (st.totalElapsed / S.total) * 100)}%`;
  $('wTotal').textContent = `남은 ${formatClock(Math.max(0, S.total - st.totalElapsed))}`;
}

// 화면 아무 데나 탭 = 지금 단계 끝내기 (자전거 주행 중엔 실수로 넘어가지 않게 버튼으로만)
$('wTap').addEventListener('click', () => {
  if (!S || !S.active || S.paused || !S.step || S.step.kind === 'ride') return;
  stopSpeech();
  S.timer.skip();
});
$('btnSkip').onclick = (e) => { e.stopPropagation(); if (S && S.active) S.timer.skip(); };

// ---- 그만두기 ------------------------------------------------------------
$('btnQuit').onclick = () => {
  if (!S) return;
  S.paused = clock();
  stopSpeech();
  if (workViewer) workViewer.stop();
  const opt = (k, emo, title, sub) => `<button data-q="${k}"><span class="emo">${emo}</span><span>${title}<small>${sub}</small></span></button>`;
  const ex = S.step && (S.step.exId || (S.step.next && S.step.next.exId));
  $('quitBody').innerHTML = opt('resume', '▶️', '계속하기', '실수로 눌렀어요') + opt('tired', '😮‍💨', '피곤해요', '여기까지 기록합니다')
    + opt('joint', '🦴', '관절이 아파요', ex ? '이 종목 레벨을 내릴지 물어봅니다' : '여기까지 기록합니다') + opt('dizzy', '😵', '어지럽거나 가슴이 답답해요', '바로 멈추고 쉬기') + opt('other', '⏹️', '그냥 그만할게요', '');
  show('quit', { replace: true });
  $('quitBody').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const q = b.dataset.q;
    if (q === 'resume') {
      S.timer.shift(clock() - S.paused);
      S.last = clock(); S.paused = 0;
      show('work', { replace: true });
      onStep(S.step, S.timer.state().index);
      return;
    }
    if (q === 'joint' && ex && data.state.levels[ex].lv > 1 && confirm('관절이 아팠던 종목의 레벨을 한 단계 내릴까요?')) { data.state = levelDown(data.state, ex); save(); }
    finish(false, q);
  };
};

// ---- 끝 -------------------------------------------------------------------
function finish(completed, quitReason) {
  if (!S || !S.active) return;
  S.active = false;
  clearInterval(S.tick);
  wakeLock.release();
  if (workViewer) workViewer.stop();
  const rec = makeRecord({ ...S, startedAt: S.startedAt, endedAt: new Date().toISOString(), completed, quitReason, bikeLv: data.state.levels.bike.lv });
  data.sessions.push(rec);
  save();
  endRec = rec;
  S = null;
  if (quitReason === 'dizzy') { show('stop', { replace: true }); return; }
  showEnd();
}
$('stopOk').onclick = showEnd;

function showEnd() {
  show('end', { replace: true });
  renderEnd({
    rec: endRec, state: data.state, sessions: data.sessions,
    onHome: () => home(),
    onSave: (evals, bike) => {
      const results = {};
      const ok = (g) => g === 'great' || g === 'good';
      for (const [id, r] of Object.entries(endRec.results || {})) {
        const ev = evals[id] || {};
        const { grade, why } = gradeStrength(r, ev);
        Object.assign(r, { done: ev.done || null, form: ev.form || null, effort: ev.effort || null, grade, why, success: ok(grade) });
        if (grade) results[id] = grade;
      }
      if (endRec.type === 'bike') {
        const b = endRec.bike;
        Object.assign(b, bike);
        const { grade, why } = gradeBike(b, bike, endRec.completed);
        Object.assign(b, { grade, why, success: ok(grade) });
        if (grade) results.bike = grade;
      }
      endRec.judged = true;
      data.state = applyResults(data.state, results, endRec.mode);
      save();
      showEnd();
    },
    onUp: (id) => { data.state = levelUp(data.state, id); save(); showEnd(); },
    onDown: (id) => { data.state = levelDown(data.state, id); save(); showEnd(); },
    onPreview: (pose) => { show('posture'); openPosture({ levels: data.state.levels, pose, kg: myKg() }); },
  });
}

// ---- 체험 모드 -----------------------------------------------------------
function markSpeed() { for (const b of $('demoSpeed').children) b.setAttribute('aria-pressed', +b.dataset.s === speed); }
$('toDemo').onclick = () => {
  demo = true;
  data = JSON.parse(JSON.stringify(data)); // 복사본 — 무엇을 해도 진짜 기록은 그대로
  document.body.classList.add('demo');
  $('demoBar').hidden = false;
  markSpeed();
  refreshHome();
};
$('demoSpeed').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; setSpeed(+b.dataset.s); markSpeed(); };
$('demoExit').onclick = () => {
  if (S) {
    S.active = false; clearInterval(S.tick); S = null;
    wakeLock.release();
    if (workViewer) workViewer.stop();
    stopSpeech();
  }
  demo = false;
  data = store.load(); // 진짜 기록으로 돌아간다
  setSpeed(1);
  document.body.classList.remove('demo');
  $('demoBar').hidden = true;
  closePosture();
  home();
};

// ---- 시작 ----------------------------------------------------------------
wireBackButtons();
document.querySelectorAll('#screen-posture .back').forEach((b) => b.addEventListener('click', closePosture));
home();
if (!store.available) $('homeBanner').insertAdjacentHTML('afterbegin', '<div class="banner warn">이 브라우저에서는 기록을 저장할 수 없습니다. 운동은 그대로 할 수 있습니다.</div>');
window.__nw = { get data() { return data; }, get S() { return S; } }; // 확인용
