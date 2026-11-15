import test from 'node:test'
import assert from 'node:assert'
import { createTokensPerMinuteLimiter } from '../utils/tokensPerMinuteLimiter.js'

function createClock() {
    let now = 0
    return {
        clock: () => now,
        sleep: async ms => {
            now += ms
        },
        advance: ms => {
            now += ms
        },
        get now() {
            return now
        }
    }
}

test('TPM limiter waits for the rolling window before allowing more tokens', async () => {
    const time = createClock()
    const limiter = createTokensPerMinuteLimiter({
        limit: 8_000,
        windowMs: 60_000,
        clock: time.clock,
        sleep: time.sleep
    })

    await limiter.acquire(5_000)
    assert.strictEqual(limiter.getUsage().used, 5_000)

    await limiter.acquire(4_000)

    assert.strictEqual(time.now, 60_000)
    assert.strictEqual(limiter.getUsage().used, 4_000)
})

test('TPM limiter reconciles reservations with actual usage', async () => {
    let sleepCalls = 0
    const limiter = createTokensPerMinuteLimiter({
        limit: 8_000,
        windowMs: 60_000,
        clock: () => 0,
        sleep: async () => {
            sleepCalls += 1
        }
    })

    const reservation = await limiter.acquire(7_000)
    reservation.reconcile(1_000)

    await limiter.acquire(7_000)

    assert.strictEqual(sleepCalls, 0)
    assert.strictEqual(limiter.getUsage().used, 8_000)
})

test('TPM limiter releases failed reservations', async () => {
    const limiter = createTokensPerMinuteLimiter({
        limit: 8_000,
        windowMs: 60_000,
        clock: () => 0,
        sleep: async () => {
            assert.fail('released tokens should not cause a wait')
        }
    })

    const reservation = await limiter.acquire(8_000)
    reservation.release()

    await limiter.acquire(8_000)
    assert.strictEqual(limiter.getUsage().used, 8_000)
})

test('TPM limiter rejects a single request larger than the limit', async () => {
    const limiter = createTokensPerMinuteLimiter({
        limit: 8_000,
        clock: () => 0,
        sleep: async () => {}
    })

    await assert.rejects(() => limiter.acquire(9_000), /exceeds the 8000 TPM limit/)
})
