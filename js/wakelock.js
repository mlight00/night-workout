// 운동 중 화면이 꺼지지 않게 한다.
// 지원하지 않는 브라우저에서는 조용히 아무것도 안 한다 — 앱은 그대로 돌아간다.

export function createWakeLock() {
  let lock = null;
  let wanted = false; // 지금 잠금을 걸고 있어야 하는 상태인가

  async function acquire() {
    wanted = true;
    if (!('wakeLock' in navigator)) return false;
    try {
      lock = await navigator.wakeLock.request('screen');
      return true;
    } catch {
      return false;
    }
  }

  async function release() {
    wanted = false;
    try {
      await lock?.release();
    } catch {
      /* 이미 풀렸으면 무시 */
    }
    lock = null;
  }

  // 다른 앱에 갔다 돌아오면 잠금이 풀려 있다. 돌아왔을 때 다시 건다.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && wanted) acquire();
  });

  return { acquire, release };
}
