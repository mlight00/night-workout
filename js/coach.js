// 이벤트 → 한국어 음성 문구. 순수 함수 — 실제 발화는 app이 맡는다.
// 규칙: 운동 시작 신호는 비프음이 맡는다. 단계가 끝나기 6초 전부터는 말하지 않는다.

import { POSES } from './body3d/poses.js';

export const QUIET_SEC = 6;
const CUE_SEC = 5; // 자세 포인트 한 줄을 말하는 데 걸리는 넉넉한 시간
const SET_WORDS = ['', '첫', '두', '세', '네', '다섯'];

export function secText(s) {
  if (s < 60) return `${s}초`;
  const m = Math.floor(s / 60), r = s % 60;
  return r ? `${m}분 ${r}초` : `${m}분`;
}

// 화면용 글자를 소리 내어 읽기 좋게: 45° → 45도, 25~35 → 25에서 35, 머리~발목 → 머리부터 발목까지
export function speakable(t) {
  return t
    .replace(/\([^)]*\)/g, '')
    .replace(/(\d+)\s*~\s*(\d+)/g, '$1에서 $2')
    .replace(/(\S+)~(\S+)/g, '$1부터 $2까지')
    .replace(/°/g, '도')
    .replace(/\s*[·—]\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 3D 자세 설명(poses.js의 c) i번째를 읽을 문장으로
export function postureLine(pose, i, mode = 'ok') {
  const c = POSES[pose] && POSES[pose][mode] && POSES[pose][mode].c;
  if (!c || !c.length) return null;
  const x = c[i % c.length];
  return speakable(`${x[1]}. ${x[2]}`);
}

// 3D 자세가 나오는 단계에서 자세 포인트를 읽어 줄 때: [{ at(경과 초), pose, i(설명 번호), text }]
//   준비 5초 / 휴식 10·22초 (세트마다 다른 포인트) / 웜업·쿨다운·자전거 웜업 8초부터 12초 간격
export function cuePlan(s) {
  let pose = null, ats = [], first = 0;
  if (s.kind === 'rest') {
    pose = s.next.pose;
    if (s.prep) ats = [5];
    else { ats = [10, 22]; first = (s.next.setNo - 1) * 2; }
  } else if (s.kind === 'warmup' || s.kind === 'cooldown' || (s.kind === 'ride' && s.zone === 'easy')) {
    pose = s.pose;
    for (let at = 8; at + CUE_SEC <= s.seconds - QUIET_SEC; at += 12) ats.push(at);
  }
  const c = pose && POSES[pose] && POSES[pose].ok.c;
  if (!c || !c.length) return [];
  ats = ats.slice(0, c.length).filter((at) => at + CUE_SEC <= s.seconds - QUIET_SEC);
  return ats.map((at, j) => {
    const i = (first + j) % c.length;
    return { at, pose, i, title: c[i][1], text: (j === 0 ? '자세 포인트. ' : '') + postureLine(pose, i) };
  });
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
    const cue = cuePlan(s).find((x) => x.at === el);
    if (cue) return cue.text;
    if (s.kind === 'rest') return r === 15 && !s.prep ? announceNext(s.next) : null;
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
