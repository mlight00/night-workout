// DOM을 만지는 유일한 파일. 로직은 없고 "받은 값을 화면에 그리기"만 한다.

import { formatClock } from './format.js';

const EXERCISE_NAMES = {
  deadhang: '데드행',
  pushup: '팔굽혀펴기',
  dips: '딥스 버티기',
  legraise: '다리 들고 버티기',
};

const $ = (id) => document.getElementById(id);

export function createUI() {
  const screens = {
    home: $('screen-home'),
    workout: $('screen-workout'),
    done: $('screen-done'),
  };

  return {
    show(name) {
      for (const [key, el] of Object.entries(screens)) {
        el.classList.toggle('is-active', key === name);
      }
    },

    // 홈: 마지막 운동 요약 한 줄
    renderHome(lastSession) {
      const el = $('home-last');
      if (!lastSession) {
        el.textContent = '아직 기록이 없습니다';
        return;
      }
      const mins = Math.round(lastSession.totalSeconds / 60);
      el.textContent = `마지막 운동 ${lastSession.date} · ${mins}분 · ${lastSession.completed ? '완주' : '중단'}`;
    },

    // 운동 화면: 매 프레임 호출된다
    renderWorkout(state) {
      const { step, remaining, totalElapsed, totalSeconds } = state;

      $('w-title').textContent = titleFor(step);
      $('w-clock').textContent = formatClock(remaining);
      $('w-clock').classList.toggle('is-warning', step.kind !== 'rest' && remaining <= 5);
      $('w-sub').textContent = subFor(step);
      $('w-progress-bar').style.width = `${Math.min(100, (totalElapsed / totalSeconds) * 100)}%`;
    },

    // 완료 화면
    renderDone(record) {
      const m = Math.floor(record.totalSeconds / 60);
      const s = record.totalSeconds % 60;
      $('done-total').textContent = `${record.date} · 총 ${m}분 ${s}초 · ${record.completed ? '완주' : '중단'}`;

      const byExercise = new Map();
      for (const set of record.sets) {
        if (!byExercise.has(set.exerciseId)) byExercise.set(set.exerciseId, []);
        byExercise.get(set.exerciseId).push(set);
      }

      $('done-list').innerHTML = '';
      for (const [id, sets] of byExercise) {
        const li = document.createElement('li');
        const name = document.createElement('span');
        const value = document.createElement('span');
        name.textContent = EXERCISE_NAMES[id] ?? id;
        value.textContent = sets.map((x) => `${x.actualSeconds}초`).join(' / ');
        li.append(name, value);
        $('done-list').append(li);
      }
    },
  };
}

function titleFor(step) {
  switch (step.kind) {
    case 'warmup': return `웜업 · ${step.name}`;
    case 'cooldown': return `쿨다운 · ${step.name}`;
    case 'ready': return `${step.name} · 준비`;
    case 'work': return `${step.name} · ${step.setNo}세트 / ${step.totalSets}`;
    case 'rest': return '휴식';
    default: return step.name;
  }
}

function subFor(step) {
  if (step.kind === 'rest') return `다음: ${step.nextName}`;
  if (step.kind === 'work' && step.type === 'reps') return `목표 ${step.reps}회 · 다 하면 탭`;
  return '';
}
