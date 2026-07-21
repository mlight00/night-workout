// 루틴 정의를 "앞에서부터 순서대로 실행하면 되는" 평탄한 단계 목록으로 펼친다.
// 순수 함수 — DOM도 시간도 모른다.

export function buildTimeline(routine) {
  const steps = [];

  for (const w of routine.warmup) {
    steps.push({ kind: 'warmup', name: w.name, seconds: w.seconds });
  }

  routine.main.forEach((ex, exIdx) => {
    const isLastExercise = exIdx === routine.main.length - 1;
    const nextExerciseName = isLastExercise ? null : routine.main[exIdx + 1].name;
    const workSeconds = ex.type === 'reps' ? ex.limitSeconds : ex.seconds;

    for (let setNo = 1; setNo <= ex.sets; setNo++) {
      const isLastSet = setNo === ex.sets;

      steps.push({
        kind: 'ready', name: ex.name, seconds: routine.readySeconds,
        exerciseId: ex.id, setNo, totalSets: ex.sets,
      });

      const work = {
        kind: 'work', name: ex.name, seconds: workSeconds,
        exerciseId: ex.id, type: ex.type, setNo, totalSets: ex.sets,
      };
      if (ex.type === 'reps') work.reps = ex.reps;
      steps.push(work);

      // 맨 마지막 종목의 마지막 세트 뒤에는 휴식을 붙이지 않는다 (바로 쿨다운)
      if (isLastExercise && isLastSet) continue;

      steps.push({
        kind: 'rest', name: '휴식', seconds: ex.restSeconds,
        exerciseId: ex.id, setNo, totalSets: ex.sets,
        nextName: isLastSet ? nextExerciseName : ex.name,
      });
    }
  });

  for (const c of routine.cooldown) {
    steps.push({ kind: 'cooldown', name: c.name, seconds: c.seconds });
  }

  return steps;
}

export function totalSeconds(steps) {
  return steps.reduce((sum, s) => sum + s.seconds, 0);
}
