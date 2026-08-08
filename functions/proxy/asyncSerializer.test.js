const { AsyncSerializer } = require('./asyncSerializer');

const tick = () => new Promise((resolve) => setImmediate(resolve));

describe('AsyncSerializer', () => {
  it('runs tasks in enqueue order, one at a time', async () => {
    const s = new AsyncSerializer();
    const order = [];

    const p1 = s.run(async () => { order.push('start 1'); await tick(); order.push('end 1'); return 1; });
    const p2 = s.run(async () => { order.push('start 2'); await tick(); order.push('end 2'); return 2; });
    const p3 = s.run(async () => { order.push('start 3'); await tick(); order.push('end 3'); return 3; });

    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

    expect(order).toEqual(['start 1', 'end 1', 'start 2', 'end 2', 'start 3', 'end 3']);
    expect([r1, r2, r3]).toEqual([1, 2, 3]);
  });

  it('never runs two tasks concurrently', async () => {
    const s = new AsyncSerializer();
    let inFlight = 0;
    let maxInFlight = 0;

    const task = async (id) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await tick();
      inFlight--;
      return id;
    };

    await Promise.all([s.run(() => task(1)), s.run(() => task(2)), s.run(() => task(3))]);

    expect(maxInFlight).toBe(1);
  });

  it('does not let a rejected task block later tasks', async () => {
    const s = new AsyncSerializer();

    const p1 = s.run(async () => { throw new Error('boom'); });
    const p2 = s.run(async () => 'ok');

    await expect(p1).rejects.toThrow('boom');
    await expect(p2).resolves.toBe('ok');
  });

  it('preserves order across a middle-task rejection', async () => {
    const s = new AsyncSerializer();
    const order = [];

    const p1 = s.run(async () => { order.push('1'); await tick(); order.push('1-end'); return 'a'; });
    const p2 = s.run(async () => { order.push('2'); await tick(); order.push('2-end'); throw new Error('mid'); });
    const p3 = s.run(async () => { order.push('3'); await tick(); order.push('3-end'); return 'c'; });

    await expect(p1).resolves.toBe('a');
    await expect(p2).rejects.toThrow('mid');
 await p3;

    // p3 still ran, strictly after p2 settled (rejection doesn't wedge the chain)
    expect(order).toEqual(['1', '1-end', '2', '2-end', '3', '3-end']);
  });

  it('preserves order across tasks enqueued in separate awaits', async () => {
    const s = new AsyncSerializer();
    const order = [];

    await s.run(async () => { order.push('a'); });
    await s.run(async () => { order.push('b'); });
    await s.run(async () => { order.push('c'); });

    expect(order).toEqual(['a', 'b', 'c']);
  });
});
