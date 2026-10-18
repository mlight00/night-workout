// 이벤트 → 한국어 음성 문구. 순수 함수 — 실제 발화는 app이 맡는다.
// 규칙: 운동 시작 신호는 비프음이 맡는다. 단계가 끝나기 6초 전부터는 말하지 않는다.

import { POSES } from './body3d/poses.js';

export const QUIET_SEC = 6;
const CUE_SEC = 5; // 자세 포인트 한 줄을 말하는 데 걸리는 넉넉한 시간
const SHORT_SEC = 4; // 운동 중 짧은 포인트(제목만)
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

// 정해진 안내가 나가는 시간 [시작, 끝) — 자세 포인트가 여기에 끼어들지 않게
function busy(s) {
  const b = [];
  if (s.kind === 'work') {
    if (s.type === 'hold') b.push([s.seconds - 10, s.seconds - 8]); // "10초"
    else if (s.setNo === 1) b.push([4, 7]); // "다 하면 화면을 탭하세요"
  }
  if (s.kind === 'ride') {
    if (s.beepEnd) b.push([s.seconds - 10, s.seconds - 4]); // "10초 뒤 세게" 등
    if (s.routine === 'steady' && s.zone === 'target') for (let t = 300; t < s.seconds; t += 300) b.push([t, t + 6]); // 심박 확인
  }
  return b;
}

// first초부터 gap 간격으로, 정해진 안내와 겹치지 않고 끝나기 6초 전까지 다 말할 수 있는 시각들
function slots(s, first, gap, len) {
  const b = busy(s), out = [];
  for (let at = first; at + len <= s.seconds - QUIET_SEC;) {
    if (b.some(([x, y]) => at < y && x < at + len)) { at++; continue; }
    out.push(at);
    at += gap;
  }
  return out;
}

// 3D 자세가 나오는 단계에서 자세 포인트를 읽어 줄 때: [{ at(경과 초), pose, i(설명 번호), title, text }]
//   운동 중: 짧게(제목만) 10초 간격으로 계속 — 버티기 첫 마디엔 "숨 참지 마세요"를 붙인다
//   자전거 목표·언덕·쿨다운: 30초부터 90초 간격으로 짧게
//   준비 5초 / 휴식 10·22초 (세트마다 다른 포인트) / 웜업·쿨다운·자전거 웜업 8초부터 12초 간격
export function cuePlan(s) {
  const pose = s.kind === 'rest' ? s.next.pose : s.pose;
  const c = pose && POSES[pose] && POSES[pose].ok.c;
  if (!c || !c.length) return [];
  const item = (at, i, text) => ({ at, pose, i, title: c[i][1], text });
  if (s.kind === 'work') {
    const hold = s.type === 'hold';
    return slots(s, hold ? 5 : 9, 10, SHORT_SEC).map((at, j) => {
      const i = j % c.length;
      return item(at, i, speakable(c[i][1]) + (hold && j === 0 && s.seconds >= 15 ? '. 숨 참지 마세요' : ''));
    });
  }
  if (s.kind === 'ride' && s.zone !== 'easy') {
    // 자전거 웜업(편하게)만 길게 읽고, 나머지 구간은 짧게. 짧은 전력 구간(빠르게)엔 끼어들지 않는다
    if (s.zone === 'fast') return [];
    return slots(s, 30, 90, CUE_SEC).map((at, j) => item(at, j % c.length, `자세. ${speakable(c[j % c.length][1])}`));
  }
  let ats = [], first = 0;
  if (s.kind === 'rest') {
    ats = s.prep ? [5] : [10, 22];
    first = s.prep ? 0 : (s.next.setNo - 1) * 2;
  } else if (s.kind === 'warmup' || s.kind === 'cooldown' || s.kind === 'ride') {
    ats = slots(s, 8, 12, CUE_SEC);
  }
  ats = ats.slice(0, c.length).filter((at) => at + CUE_SEC <= s.seconds - QUIET_SEC);
  return ats.map((at, j) => {
    const i = (first + j) % c.length;
    return item(at, i, (j === 0 ? '자세 포인트. ' : '') + postureLine(pose, i));
  });
}

// 자전거 구간이 시작될 때 — 저항은 화면에선 "+2", 말로는 "두 단계"
const STEP_WORDS = ['', '한', '두', '세', '네'];
export function rideStart(s) {
  const t = secText(s.seconds);
  switch (s.zone) {
    case 'easy': return `자전거 웜업 ${t}. 저항은 가장 낮게, 편하게 돌리세요`;
    case 'build': return `저항을 한두 단계 올리세요. ${t} 동안 숨이 조금 찰 때까지. 심박은 1, 2분 늦게 따라오니 숫자보다 느낌으로`;
    case 'hard': return `${s.n === 1 ? '인터벌 시작. ' : ''}세게 ${t}. 저항 두 단계 올리고, 짧은 말만 할 수 있을 정도로`;
    case 'fast': return `${s.n === 1 ? '빠르게 돌리기 시작. ' : ''}빠르게 ${t}. 저항은 그대로, 다리를 빠르게`;
    case 'recover': return `편하게 ${t}. ${s.routine === 'speed' ? '천천히 돌리며' : '저항을 내리고'} 숨을 고르세요${s.n === s.of ? '. 마지막입니다' : ''}`;
    case 'cool': return '쿨다운. 저항을 가장 낮게, 천천히 돌리세요';
    default: break;
  }
  if (s.routine === 'pyramid') {
    const k = STEP_WORDS[s.k];
    if (s.dir === 'first') return `피라미드. ${secText(s.each)}마다 저항을 한 단계씩 올렸다가 내립니다. 지금은 기본 저항`;
    if (s.dir === 'up') return `저항 한 단계 올리세요. 지금 기본보다 ${k} 단계`;
    if (s.dir === 'same') return `그대로 유지. ${t} 더`;
    return s.k ? `저항 한 단계 내리세요. 지금 기본보다 ${k} 단계` : '저항을 기본으로 내리세요. 마지막 구간';
  }
  return `꾸준히 ${t}. 심박 ${s.hr[0]}에서 ${s.hr[1]}, 대화할 수 있는 정도로`;
}

// 다음 구간이 더 힘들 때 10초 전 예고
export function rideSoon(n) {
  if (!n) return null;
  if (n.zone === 'hard') return '10초 뒤 세게. 저항 올릴 준비';
  if (n.zone === 'fast') return '10초 뒤 빠르게';
  return '10초 뒤 저항 한 단계 올리기';
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
        return rideStart(s);
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
      if (s.beepEnd && r === 10) return rideSoon(s.upNext);
      if (s.routine === 'steady' && s.zone === 'target' && el > 0 && el % 300 === 0) return `심박 확인. 목표 ${s.hr[0]}에서 ${s.hr[1]}`;
    }
    return null;
  }
  return null;
}
