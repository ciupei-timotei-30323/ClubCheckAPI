/**
 * Serialises tasks and guarantees that consecutive task starts are separated by
 * at least `minIntervalMs`. The returned scheduler is safe to share between
 * concurrent workers, which is required for MusicBrainz's global 1 req/second
 * limit.
 */
export function createRateLimiter({
    minIntervalMs = 1_000,
    clock = () => Date.now(),
    sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
    logger
} = {}) {
    if (!Number.isFinite(minIntervalMs) || minIntervalMs < 0) {
        throw new Error('createRateLimiter requires a non-negative minIntervalMs')
    }

    let nextAllowedAt = 0
    let tail = Promise.resolve()

    function schedule(task) {
        if (typeof task !== 'function') {
            throw new Error('createRateLimiter.schedule requires a function')
        }

        const run = tail.then(async () => {
            const waitMs = Math.max(0, nextAllowedAt - clock())

            if (waitMs > 0) {
                logger?.debug({ waitMs, minIntervalMs }, 'Rate limit wait')
                await sleep(waitMs)
            }

            nextAllowedAt = clock() + minIntervalMs
            return task()
        })

        // Keep the chain alive after failures, while still propagating the
        // original error to the caller of schedule().
        tail = run.catch(() => undefined)
        return run
    }

    return {
        schedule,
        get nextAllowedAt() {
            return nextAllowedAt
        }
    }
}
