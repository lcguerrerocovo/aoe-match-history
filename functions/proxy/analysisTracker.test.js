const { analysisTracker } = require('./analysisTracker');

describe('analysisTracker', () => {
  beforeEach(() => {
    analysisTracker.clear();
  });

  it('tracks in-flight match processing', () => {
    expect(analysisTracker.isInFlight('123')).toBe(false);
    analysisTracker.markInFlight('123');
    expect(analysisTracker.isInFlight('123')).toBe(true);
  });

  it('removes completed entries', () => {
    analysisTracker.markInFlight('123');
    analysisTracker.markDone('123');
    expect(analysisTracker.isInFlight('123')).toBe(false);
  });

  it('expires entries after TTL', () => {
    jest.useFakeTimers();
    analysisTracker.markInFlight('123');
    jest.advanceTimersByTime(61_000);
    expect(analysisTracker.isInFlight('123')).toBe(false);
    jest.useRealTimers();
  });

  it('clear removes all entries', () => {
    analysisTracker.markInFlight('a');
    analysisTracker.markInFlight('b');
    analysisTracker.clear();
    expect(analysisTracker.isInFlight('a')).toBe(false);
    expect(analysisTracker.isInFlight('b')).toBe(false);
  });
});
