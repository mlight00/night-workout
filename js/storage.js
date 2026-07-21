// 운동 기록 조립과 저장. storage 주입식이라 테스트 가능하다.
// 서버는 없다 — 기록은 이 기기 안에만 존재한다.

const KEY = 'nightWorkout.v1';

// 타이머가 뱉은 stepEnd 이벤트들을 하루치 기록으로 조립한다.
// work 단계만 남기고 나머지(웜업·휴식·쿨다운)는 버린다.
export function buildRecord({ events, startedAt, endedAt, completed }) {
  const sets = events
    .filter((e) => e.type === 'stepEnd' && e.step.kind === 'work')
    .map((e) => ({
      exerciseId: e.step.exerciseId,
      setNo: e.step.setNo,
      targetSeconds: e.step.type === 'reps' ? null : e.step.seconds,
      targetReps: e.step.type === 'reps' ? e.step.reps : null,
      actualSeconds: Math.round(e.actualSeconds),
      actualReps: null,        // 2단계에서 AI가 채운다
      source: 'estimated',     // 2단계에서 'measured'가 들어온다
    }));

  const start = new Date(startedAt);
  const end = new Date(endedAt);

  return {
    date: toLocalDate(start),
    startedAt,
    endedAt,
    totalSeconds: Math.round((end - start) / 1000),
    completed,
    sets,
  };
}

function toLocalDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function createStore(storage) {
  let available = true;
  try {
    storage.getItem(KEY);
  } catch {
    available = false;
  }

  function readAll() {
    if (!available) return [];
    try {
      const raw = storage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return []; // 깨진 데이터로 앱이 죽지 않게 한다
    }
  }

  return {
    available,

    allSessions() {
      return readAll().sort((a, b) => String(a.date).localeCompare(String(b.date)));
    },

    lastSession() {
      const all = this.allSessions();
      return all.length ? all[all.length - 1] : null;
    },

    saveSession(record) {
      if (!available) return;
      try {
        storage.setItem(KEY, JSON.stringify([...readAll(), record]));
      } catch {
        /* 저장 실패해도 운동은 계속된다 */
      }
    },
  };
}
