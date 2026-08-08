/**
 * Minimal async serializer: ensures async tasks run one at a time, strictly
 * in the order they are enqueued.
 *
 * Used to serialize Relic API calls per Cloud Run instance so that the shared
 * per-session `callNum` is sent strictly increasing on the wire. Concurrent
 * Relic calls arrived out of order at Relic, which the platform treated as an
 * auth failure (401) and invalidated the shared session (issue #37). A failing
 * task never blocks subsequent tasks.
 */
export class AsyncSerializer {
    private tail: Promise<void> = Promise.resolve();

    /**
     * Run `fn` after all previously-enqueued tasks finish, returning its
     * result. Tasks execute strictly in enqueue order; a rejected task does
     * not prevent later tasks from running.
     */
    run<T>(fn: () => Promise<T>): Promise<T> {
        // Wait for the prior tail (swallow its error so a failed task can never
        // wedge the chain), then run fn.
        const result = this.tail.catch(() => {}).then(() => fn());
        // Advance the tail past this task regardless of its outcome.
        this.tail = result.then(() => undefined, () => undefined);
        return result;
    }
}
