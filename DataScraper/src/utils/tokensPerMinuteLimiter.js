export const DEFAULT_TPM_LIMIT = 8_000
export const DEFAULT_TPM_WINDOW_MS = 60_000

/**
 * Rolling-window token limiter. A caller reserves the maximum number of tokens
 * its request may consume; the reservation is reconciled with the actual usage
 * after the request completes, or released when the request fails.
 *
 * The limiter is shared by all Groq classification calls in the process.
 */
export function createTokensPerMinuteLimiter({
    limit = DEFAULT_TPM_LIMIT,
    windowMs = DEFAULT_TPM_WINDOW_MS,
    clock = () => Date.now(),
    sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
    logger
} = {}) {
    if (!Number.isFinite(limit) || limit <= 0) {
        throw new Error('createTokensPerMinuteLimiter requires a positive limit')
    }

    if (!Number.isFinite(windowMs) || windowMs <= 0) {
        throw new Error('createTokensPerMinuteLimiter requires a positive windowMs')
    }

    const reservations = []
    let acquireTail = Promise.resolve()

    function prune(now) {
        for (let index = reservations.length - 1; index >= 0; index -= 1) {
            const reservation = reservations[index]

            if (now - reservation.at >= windowMs || reservation.tokens <= 0) {
                reservations.splice(index, 1)
            }
        }
    }

    function usedTokens(now) {
        return reservations.reduce((total, reservation) => {
            return now - reservation.at < windowMs ? total + reservation.tokens : total
        }, 0)
    }

    function createReservation(tokens, reservedAt) {
        const reservation = {
            at: reservedAt,
            tokens,
            settled: false,
            reconcile(actualTokens) {
                if (reservation.settled) {
                    return
                }

                const actual = Number(actualTokens)
                reservation.tokens = Number.isFinite(actual) && actual >= 0
                    ? Math.ceil(actual)
                    : reservation.tokens
                reservation.settled = true
            },
            release() {
                if (reservation.settled) {
                    return
                }

                reservation.tokens = 0
                reservation.settled = true
            }
        }

        reservations.push(reservation)
        return reservation
    }

    async function acquire(tokens) {
        const requestedTokens = Math.ceil(Number(tokens))

        if (!Number.isFinite(requestedTokens) || requestedTokens <= 0) {
            throw new Error('acquire requires a positive token count')
        }

        if (requestedTokens > limit) {
            throw new Error(
                `Groq request needs ${requestedTokens} tokens, which exceeds the ${limit} TPM limit`
            )
        }

        const run = acquireTail.then(async () => {
            let reportedWait = false

            while (true) {
                const now = clock()
                prune(now)
                const used = usedTokens(now)

                if (used + requestedTokens <= limit) {
                    const reservation = createReservation(requestedTokens, now)

                    logger?.debug(
                        { requestedTokens, used, limit, windowMs },
                        'Groq token budget reserved'
                    )

                    return reservation
                }

                const oldest = reservations.find(reservation => reservation.tokens > 0)
                const timeUntilOldestExpires = oldest
                    ? Math.max(1, oldest.at + windowMs - now)
                    : windowMs

                // Poll at most once per second. Reservations are reconciled or
                // released as soon as a request finishes, so waiting for the
                // full window would be unnecessarily conservative.
                const waitMs = Math.min(1_000, timeUntilOldestExpires)

                if (!reportedWait) {
                    logger?.info(
                        { used, requestedTokens, limit, waitMs },
                        'Groq TPM limit reached; waiting'
                    )
                    reportedWait = true
                } else {
                    logger?.debug(
                        { used, requestedTokens, limit, waitMs },
                        'Waiting for Groq token budget'
                    )
                }

                await sleep(waitMs)
            }
        })

        acquireTail = run.then(() => undefined, () => undefined)
        return run
    }

    function getUsage() {
        const now = clock()
        prune(now)

        return {
            used: usedTokens(now),
            limit,
            windowMs,
            remaining: Math.max(0, limit - usedTokens(now))
        }
    }

    return {
        acquire,
        getUsage
    }
}
