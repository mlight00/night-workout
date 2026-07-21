// 남은 시간을 화면에 띄울 문자열로. 2~3m 거리에서 읽어야 하므로 짧을수록 좋다.
// 60초 미만이면 분 표기를 생략한다.
export function formatClock(seconds) {
  const s = Math.ceil(Math.max(0, seconds));
  if (s < 60) return String(s);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
