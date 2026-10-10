// 타임라인 진행 엔진.
// 현재 시각(ms)을 주입받는다 — Date.now()도 setInterval도 쓰지 않으므로
// 테스트에서 25분을 한순간에 흘려보낼 수 있다.

export function createTimer(steps) {
  let index = 0;
  let stepStartMs = 0;      // 현재 단계가 시작된 시각
  let lastTickMs = 0;       // 마지막으로 tick된 시각 (state()가 "지금"을 알아야 해서)
  let finishedBefore = 0;   // 이미 끝난 단계들의 실제 소요 시간 합(초)
  let lastRemaining = null; // 마지막으로 알린 남은 초
  let skipRequested = false;
  let finished = false;

  const totalPlanned = steps.reduce((sum, s) => sum + s.seconds, 0);

  function beginStep(nowMs) {
    stepStartMs = nowMs;
    lastRemaining = steps[index].seconds;
    return { type: 'stepStart', index, step: steps[index] };
  }

  function start(nowMs) {
    lastTickMs = nowMs;
    return [beginStep(nowMs)];
  }

  function tick(nowMs) {
    lastTickMs = nowMs;
    if (finished) return [];
    const events = [];

    while (!finished) {
      const step = steps[index];
      const elapsed = (nowMs - stepStartMs) / 1000;
      const ended = skipRequested || elapsed >= step.seconds;

      if (!ended) {
        // 남은 초가 줄어든 만큼 second 이벤트를 빠짐없이 발생시킨다
        const remaining = Math.ceil(step.seconds - elapsed);
        while (lastRemaining > remaining) {
          lastRemaining -= 1;
          events.push({ type: 'second', index, step, remaining: lastRemaining });
        }
        break;
      }

      const actualSeconds = skipRequested ? elapsed : step.seconds;
      const reason = skipRequested ? 'skip' : 'timeout';
      events.push({ type: 'stepEnd', index, step, actualSeconds, reason });

      finishedBefore += actualSeconds;
      skipRequested = false;

      if (index === steps.length - 1) {
        finished = true;
        events.push({ type: 'sessionEnd' });
        break;
      }

      index += 1;
      // 예정보다 일찍/늦게 끝났어도 다음 단계는 "실제로 끝난 시점"부터 시작한다
      events.push(beginStep(stepStartMs + actualSeconds * 1000));
    }

    return events;
  }

  function skip() {
    skipRequested = true;
  }

  // 일시정지했던 시간만큼 현재 단계를 뒤로 민다 (그만두기 확인 화면에서 "계속하기")
  function shift(ms) {
    stepStartMs += ms;
    lastTickMs += ms;
  }

  function state() {
    const step = steps[index];
    if (finished) {
      return {
        index, step, remaining: 0, elapsed: step.seconds,
        totalElapsed: finishedBefore, totalSeconds: totalPlanned, finished: true,
      };
    }
    const elapsed = Math.max(0, (lastTickMs - stepStartMs) / 1000);
    return {
      index, step,
      remaining: Math.max(0, step.seconds - elapsed),
      elapsed,
      totalElapsed: finishedBefore + elapsed,
      totalSeconds: totalPlanned,
      finished: false,
    };
  }

  return { start, tick, skip, shift, state };
}
