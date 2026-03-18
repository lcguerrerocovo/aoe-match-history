interface QueueItem<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

export function createLimiter(maxConcurrent: number) {
  let active = 0;
  const queue: QueueItem<unknown>[] = [];

  function next() {
    if (queue.length === 0 || active >= maxConcurrent) return;
    active++;
    const { fn, resolve, reject } = queue.shift()!;
    fn().then(resolve, reject).finally(() => {
      active--;
      next();
    });
  }

  return {
    run<T>(fn: () => Promise<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        queue.push({ fn: fn as () => Promise<unknown>, resolve: resolve as (value: unknown) => void, reject });
        next();
      });
    }
  };
}
