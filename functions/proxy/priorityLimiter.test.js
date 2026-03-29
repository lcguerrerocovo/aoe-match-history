const { createPriorityLimiter } = require('./priorityLimiter');

describe('createPriorityLimiter', () => {
  it('processes one request at a time', async () => {
    const limiter = createPriorityLimiter({ minDelayMs: 0 });
    let running = 0;
    let maxRunning = 0;

    const task = () => limiter.run(async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise(r => setTimeout(r, 20));
      running--;
      return 'done';
    });

    await Promise.all([task(), task(), task()]);
    expect(maxRunning).toBe(1);
  });

  it('priority tasks jump ahead of normal tasks', async () => {
    const limiter = createPriorityLimiter({ minDelayMs: 0 });
    const order = [];

    // Start a task that's running (blocks the queue)
    const blocker = limiter.run(async () => {
      await new Promise(r => setTimeout(r, 50));
      order.push('blocker');
    });

    // Queue normal tasks
    const normal1 = limiter.run(async () => { order.push('normal1'); });
    const normal2 = limiter.run(async () => { order.push('normal2'); });

    // Queue priority task (should jump ahead of normal1 and normal2)
    const priority = limiter.runPriority(async () => { order.push('priority'); });

    await Promise.all([blocker, normal1, normal2, priority]);
    expect(order).toEqual(['blocker', 'priority', 'normal1', 'normal2']);
  });

  it('returns task results', async () => {
    const limiter = createPriorityLimiter({ minDelayMs: 0 });
    const result = await limiter.run(async () => 42);
    expect(result).toBe(42);
  });

  it('propagates errors', async () => {
    const limiter = createPriorityLimiter({ minDelayMs: 0 });
    await expect(limiter.run(async () => { throw new Error('boom'); }))
      .rejects.toThrow('boom');
  });

  it('enforces minimum delay between requests', async () => {
    const limiter = createPriorityLimiter({ minDelayMs: 50 });
    const times = [];

    const task = () => limiter.run(async () => {
      times.push(Date.now());
    });

    await task();
    await task();
    await task();

    // Gap between second and first should be >= 50ms
    expect(times[1] - times[0]).toBeGreaterThanOrEqual(45); // 5ms tolerance
    expect(times[2] - times[1]).toBeGreaterThanOrEqual(45);
  });

  it('applies global backoff that affects all queued tasks', async () => {
    const limiter = createPriorityLimiter({ minDelayMs: 0 });
    const startTime = Date.now();
    const times = [];

    // Set a 100ms backoff
    limiter.applyBackoff(100);

    await limiter.run(async () => { times.push(Date.now()); });

    // First task after backoff should wait
    expect(times[0] - startTime).toBeGreaterThanOrEqual(90);
  });
});
