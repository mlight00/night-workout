// 이벤트를 한국어 음성 문구로 바꾼다.
// lineFor는 순수 함수 — 브라우저를 모른다. 실제 발화는 createCoach에 주입한다.
// 문구를 바꾸고 싶으면 이 파일만 고치면 된다.

const SET_WORDS = ['', '첫', '두', '세', '네', '다섯'];

export function lineFor(event) {
  if (event.type === 'sessionEnd') return '오늘 운동 끝났습니다. 참 잘하셨어요';
  if (event.type === 'stepEnd') return null;

  const step = event.step;

  if (event.type === 'stepStart') {
    switch (step.kind) {
      case 'warmup':
      case 'cooldown':
        return `${step.name}, ${step.seconds}초`;
      case 'ready':
        return `${step.name}, ${SET_WORDS[step.setNo]} 번째 세트. 준비`;
      case 'work':
        return step.type === 'reps'
          ? `시작. ${step.reps}회. 다 하시면 화면을 탭하세요`
          : `시작. ${step.seconds}초 버티세요`;
      case 'rest':
        return `완료. ${step.seconds}초 휴식. 다음은 ${step.nextName}`;
    }
    return null;
  }

  if (event.type === 'second') {
    const r = event.remaining;
    switch (step.kind) {
      case 'ready':
        return { 3: '셋', 2: '둘', 1: '하나' }[r] ?? null;
      case 'work':
        if (r === 10) return '10초 남았습니다';
        if (r === 5) return '좋습니다, 5초';
        return null;
      case 'rest':
        return r === 10 ? '10초 뒤 시작합니다. 자리로 오세요' : null;
      default:
        return null; // 웜업·쿨다운은 조용히
    }
  }

  return null;
}

export function createCoach(speak) {
  return {
    handle(event) {
      const line = lineFor(event);
      if (line) speak(line);
    },
  };
}
