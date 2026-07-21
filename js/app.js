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

// 진행 루프 간격. requestAnimationFrame이 아니라 setInterval을 쓴다 —
// rAF는 화면이 꺼지거나 다른 앱으로 넘어가면 완전히 멈춰서 타이머가 얼어붙는다.
// 타이머 엔진은 실제 시각을 기준으로 계산하므로 간격이 밀려도 알아서 따라잡는다.
const TICK_MS = 200;

// 이 시간 이상 루프가 밀렸다면 화면이 꺼졌다 켜진 것으로 본다.
// 밀린 안내 음성을 전부 쏟아내지 않고 현재 단계만 다시 알려준다.
const CATCHUP_GAP_MS = 3000;

let timer = null;
let tickId = null;
let lastLoopMs = 0;
let stepEndEvents = [];
let startedAt = null;
let sessionActive = false;

// --- 음성 ---------------------------------------------------------------

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  u.rate = 1.05;
  window.speechSynthesis.speak(u);
}

// 안드로이드 크롬은 사용자가 화면을 누른 적이 없으면 음성을 막는다.
// 시작 버튼을 누르는 순간 소리 없는 문장을 한 번 흘려서 잠금을 푼다.
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

  timer = createTimer(buildTimeline(ROUTINE));
  stepEndEvents = [];
  startedAt = new Date().toISOString();
  sessionActive = true;

  ui.show('workout');
  lastLoopMs = performance.now();
  handleEvents(timer.start(lastLoopMs));
  ui.renderWorkout(timer.state());
  tickId = setInterval(loop, TICK_MS);
}

function loop() {
  const now = performance.now();
  const gap = now - lastLoopMs;
  lastLoopMs = now;

  // 크게 밀렸다면(화면 꺼짐 등) 밀린 안내는 건너뛰고 현재 단계만 다시 알려준다
  const catchingUp = gap > CATCHUP_GAP_MS;
  if (catchingUp) window.speechSynthesis?.cancel();

  handleEvents(timer.tick(now), catchingUp);
  if (!sessionActive) return;
  ui.renderWorkout(timer.state());
}

function handleEvents(events, catchingUp = false) {
  // 따라잡는 중에는 마지막 단계 시작 안내 하나만 말한다
  const lastStart = catchingUp ? events.filter((e) => e.type === 'stepStart').at(-1) : null;

  for (const e of events) {
    if (!catchingUp || e === lastStart || e.type === 'sessionEnd') coach.handle(e);
    if (e.type === 'stepEnd') stepEndEvents.push(e);
    if (e.type === 'sessionEnd') finishSession(true);
  }
}

function finishSession(completed) {
  if (!sessionActive) return;
  sessionActive = false;
  clearInterval(tickId);
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
document.getElementById('btn-quit').addEventListener('click', quitSession);

// 화면 아무 데나 탭 = 현재 단계 즉시 종료.
// 밀린 음성은 취소한다 — 안 그러면 빠르게 탭할 때 안내가 화면보다 한참 뒤처진다.
document.getElementById('tap-area').addEventListener('click', () => {
  if (!sessionActive) return;
  window.speechSynthesis?.cancel();
  timer.skip();
});

goHome();
