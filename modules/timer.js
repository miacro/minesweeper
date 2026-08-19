const MAX_ELAPSED_MS = 999_999;

export function createGameTimer({
  onTick,
  onPersist,
  now = Date.now,
  schedule = (callback) => window.setInterval(callback, 250),
  cancel = (intervalId) => window.clearInterval(intervalId),
}) {
  let accumulatedMs = 0;
  let startedAt = null;
  let intervalId = null;
  let lastDisplayedSecond = -1;
  let lastPersistedSecond = -1;

  function elapsedMilliseconds() {
    const runningMs = startedAt === null ? 0 : Math.max(0, now() - startedAt);
    return Math.min(accumulatedMs + runningMs, MAX_ELAPSED_MS);
  }

  function elapsedSeconds() {
    return Math.min(Math.floor(elapsedMilliseconds() / 1000), 999);
  }

  function sync({ force = false, persist = true } = {}) {
    const seconds = elapsedSeconds();
    if (force || seconds !== lastDisplayedSecond) {
      lastDisplayedSecond = seconds;
      onTick(seconds);
    }
    if (persist && startedAt !== null && seconds !== lastPersistedSecond) {
      lastPersistedSecond = seconds;
      onPersist();
    }
  }

  function clearTicker() {
    cancel(intervalId);
    intervalId = null;
  }

  function stop() {
    if (startedAt !== null) {
      accumulatedMs = elapsedMilliseconds();
      startedAt = null;
    }
    clearTicker();
  }

  return {
    start() {
      if (startedAt !== null) return;
      startedAt = now();
      sync({ force: true, persist: false });
      intervalId = schedule(sync);
    },

    pause() {
      stop();
      sync({ force: true, persist: false });
    },

    stop,

    reset() {
      startedAt = null;
      accumulatedMs = 0;
      lastDisplayedSecond = -1;
      lastPersistedSecond = -1;
      clearTicker();
      sync({ force: true, persist: false });
    },

    restore(elapsedMs) {
      startedAt = null;
      accumulatedMs = Math.min(Math.max(Number(elapsedMs) || 0, 0), MAX_ELAPSED_MS);
      lastDisplayedSecond = -1;
      lastPersistedSecond = -1;
      clearTicker();
      sync({ force: true, persist: false });
    },

    getElapsedMilliseconds: elapsedMilliseconds,
    getElapsedSeconds: elapsedSeconds,
    isRunning() {
      return startedAt !== null;
    },
  };
}
