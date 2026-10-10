// 음성 안내 (브라우저 speechSynthesis) — 운동 화면과 「자세 보기」가 같이 쓴다.
// 새 말이 이전 말을 끊는다 — 밀린 말은 버린다.

const SS = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voice = null;
let seq = 0; // 끊긴 말의 끝 알림(onend)이 다음 말을 부르지 않게 하는 번호
let current = null; // 크롬은 말하는 중인 문장 객체를 붙잡아 두지 않으면 끝 알림을 잃어버린다

function pickVoice() {
  const vs = SS ? SS.getVoices() : [];
  voice = vs.find((v) => v.lang === 'ko-KR' && /google/i.test(v.name)) || vs.find((v) => v.lang && v.lang.startsWith('ko')) || null;
}
if (SS) { pickVoice(); SS.onvoiceschanged = pickVoice; }

export const canSpeak = !!SS;

// onend: 끝까지 말했을 때만 불린다 (중간에 끊기면 안 불림)
export function speak(text, onend) {
  if (!SS || !text) return;
  const my = ++seq;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  if (voice) u.voice = voice;
  u.rate = 1.08;
  current = u;
  if (onend) u.onend = () => { if (my === seq) onend(); };
  // 안드로이드 크롬은 cancel 직후 바로 speak하면 새 말을 삼키는 경우가 있어 아주 조금 띄운다.
  if (SS.speaking || SS.pending) {
    SS.cancel();
    setTimeout(() => { if (my === seq) SS.speak(u); }, 80);
  } else {
    SS.speak(u);
  }
}

export function stopSpeech() {
  seq++;
  if (SS) SS.cancel();
}

// 첫 터치 때 한 번: 소리 없는 말로 음성 엔진을 깨워 둔다
export function unlockSpeech() {
  if (!SS) return;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  SS.speak(u);
}
