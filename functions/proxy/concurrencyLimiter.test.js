const { createLimiter } = require('./concurrencyLimiter');

describe('createLimiter', () => {
  it('limits concurrent executions', async () => {
    const limiter = createLimiter(2);
    let running = 0;
    let maxRunning = 0;

    const task = () => limiter.run(async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise(r => setTimeout(r, 50));
      running--;
    });

    await Promise.all([task(), task(), task(), task(), task()]);
    expect(maxRunning).toBe(2);
  });

  it('returns the task result', async () => {
    const limiter = createLimiter(2);
    const result = await limiter.run(async () => 'hello');
    expect(result).toBe('hello');
  });

  it('propagates errors', async () => {
    const limiter = createLimiter(2);
    await expect(limiter.run(async () => { throw new Error('boom'); }))
      .rejects.toThrow('boom');
  });
});
