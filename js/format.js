// 남은 시간을 화면에 띄울 문자열로. 2~3m 거리에서 읽어야 하므로 짧을수록 좋다.
// 60초 미만이면 분 표기를 생략한다.
export function formatClock(seconds) {
  const s = Math.ceil(Math.max(0, seconds));
  if (s < 60) return String(s);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

// 받침에 맞춰 "로/으로"를 붙인다 (숫자는 읽는 소리 기준: 1·7·8은 ㄹ, 0·3·6은 받침 있음)
export function withRo(t) {
  const s = String(t).trim(), c = s.slice(-1), code = c.charCodeAt(0) - 0xac00;
  let jong = 0;
  if (code >= 0 && code < 11172) jong = code % 28;
  else if (/\d/.test(c)) jong = { 0: 1, 1: 8, 2: 0, 3: 1, 4: 0, 5: 0, 6: 1, 7: 8, 8: 8, 9: 0 }[c];
  return s + (jong && jong !== 8 ? '으로' : '로');
}
