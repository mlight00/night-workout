// 이벤트 → 한국어 음성 문구. 순수 함수 — 실제 발화는 app이 맡는다.
// 규칙: 운동 시작 신호는 비프음이 맡는다. 단계가 끝나기 6초 전부터는 말하지 않는다.

export const QUIET_SEC = 6;
const SET_WORDS = ['', '첫', '두', '세', '네', '다섯'];

export function secText(s) {
  if (s < 60) return `${s}초`;
  const m = Math.floor(s / 60), r = s % 60;
  return r ? `${m}분 ${r}초` : `${m}분`;
}

const target = (w) => (w.type === 'hold' ? `${w.target}초 버티기` : `${w.target}회`);

export function announceNext(w) {
  return `다음은 ${w.name}, ${SET_WORDS[w.setNo]} 번째 세트. ${target(w)}${w.cue ? `. ${w.cue}` : ''}`;
}

export function lineFor(e) {
  if (e.type === 'sessionEnd') return '오늘 운동 끝났습니다. 참 잘하셨어요';
  if (e.type === 'stepEnd') return null;
  const s = e.step;

  if (e.type === 'stepStart') {
    switch (s.kind) {
      case 'warmup':
      case 'cooldown':
        return s.say || `${s.name}, ${secText(s.seconds)}`;
      case 'rest':
        if (s.prep) return `준비. ${s.seconds}초 뒤 ${s.next.name} 시작합니다`;
        return `${s.after ? `${s.after}. ` : ''}완료. ${secText(s.seconds)} 휴식`;
      case 'ride':
        if (s.zone === 'easy') return `웜업 ${secText(s.seconds)}. 저항은 낮게, 심박 ${s.hr[1]} 이하`;
        if (s.zone === 'hill') return `언덕 구간 ${secText(s.seconds)}. 심박 ${s.hr[1]}을 넘지 않게`;
        if (s.zone === 'cool') return '쿨다운. 저항을 가장 낮게, 천천히 돌리세요';
        return `${s.afterHill ? '저항을 내리세요. ' : ''}목표 구간. 심박 ${s.hr[0]}에서 ${s.hr[1]}`;
      default:
        return null; // work: 비프음이 시작 신호
    }
  }

  if (e.type === 'second') {
    const r = e.remaining, el = s.seconds - r;
    if (r < QUIET_SEC) return null;
    if (s.kind === 'rest') return r === 15 ? announceNext(s.next) : null;
    if (s.kind === 'work') {
      if (s.type === 'hold') {
        if (r === 10) return '10초';
        if (s.seconds >= 15 && el === 5) return '숨 참지 마세요';
        return null;
      }
      return s.setNo === 1 && el === 4 ? '다 하면 화면을 탭하세요' : null;
    }
    if (s.kind === 'ride') {
      if (s.nextZone === 'hill' && r === 10) return '10초 뒤 언덕 구간. 저항을 두 단계 올리세요';
      if (s.zone === 'target' && el > 0 && el % 300 === 0) return `심박 확인. 목표 ${s.hr[0]}에서 ${s.hr[1]}`;
    }
    return null;
  }
  return null;
}
