// 비프음 — 운동 시작 신호. 음성처럼 줄을 서지 않도록 Web Audio 시계로 정확한 시각에 예약한다.
// countdownPlan / needsCountdown 은 순수 함수(테스트용), createBeeper 는 브라우저 전용.

export const COUNT_FROM = 3;

// 이 단계가 끝나는 순간이 "운동 시작"인가
export function needsCountdown(step) {
  return step.kind === 'rest' || (step.kind === 'ride' && !!step.beepEnd);
}

// remaining초 뒤에 단계가 끝날 때: 짧게 3번(3·2·1초 전) + 끝나는 순간 길게 1번
export function countdownPlan(remaining) {
  const plan = [];
  for (let k = COUNT_FROM; k >= 1; k--) {
    const at = remaining - k;
    if (at >= -0.05) plan.push({ at: Math.max(0, at), long: false });
  }
  plan.push({ at: Math.max(0, remaining), long: true });
  return plan;
}

export function createBeeper() {
  let ctx = null;
  const live = new Set(); // 아직 안 끝난(예약된) 소리
  const get = () => {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };

  function tone(at, dur, freq, vol = 0.35) {
    const c = get();
    if (!c) return;
    const t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.setValueAtTime(vol, t + dur - 0.03);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
    live.add(o);
    o.onended = () => live.delete(o);
  }

  return {
    unlock() { tone(0, 0.05, 440, 0.001); }, // 사용자 탭 순간에 오디오 잠금 해제
    countdown(remaining) {
      for (const b of countdownPlan(remaining)) b.long ? tone(b.at, 0.6, 1046) : tone(b.at, 0.12, 784);
    },
    ding() { tone(0, 0.18, 660, 0.25); },
    // 예약된 소리 전부 취소 (잠깐 멈춤)
    cancel() {
      for (const o of live) { try { o.stop(); } catch { /* 이미 끝남 */ } }
      live.clear();
    },
  };
}
