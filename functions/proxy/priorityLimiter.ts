interface QueueItem<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

interface PriorityLimiterOptions {
  minDelayMs?: number;
}

export function createPriorityLimiter(options: PriorityLimiterOptions = {}) {
  const minDelayMs = options.minDelayMs ?? 3000;
  let active = false;
  let lastCompleted = 0;
  let backoffUntil = 0;
  const queue: QueueItem<unknown>[] = [];

  function next() {
    if (queue.length === 0 || active) return;
    active = true;
    const { fn, resolve, reject } = queue.shift()!;

    const now = Date.now();
    const delayForRate = Math.max(0, lastCompleted + minDelayMs - now);
    const delayForBackoff = Math.max(0, backoffUntil - now);
    const delay = Math.max(delayForRate, delayForBackoff);

    const execute = () => {
      fn().then(resolve, reject).finally(() => {
        lastCompleted = Date.now();
        active = false;
        next();
      });
    };

    if (delay > 0) {
      setTimeout(execute, delay);
    } else {
      execute();
    }
  }

  return {
    run<T>(fn: () => Promise<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        queue.push({ fn: fn as () => Promise<unknown>, resolve: resolve as (value: unknown) => void, reject });
        next();
      });
    },

    runPriority<T>(fn: () => Promise<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        queue.unshift({ fn: fn as () => Promise<unknown>, resolve: resolve as (value: unknown) => void, reject });
        next();
      });
    },

    applyBackoff(ms: number): void {
      backoffUntil = Date.now() + ms;
    },
  };
}
