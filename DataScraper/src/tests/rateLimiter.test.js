import test from 'node:test'
import assert from 'node:assert'
import { createRateLimiter } from '../utils/rateLimiter.js'

test('rate limiter spaces consecutive task starts', async () => {
    let now = 0
    const starts = []
    const limiter = createRateLimiter({
        minIntervalMs: 1_000,
        clock: () => now,
        sleep: async ms => {
            now += ms
        }
    })

    await Promise.all([
        limiter.schedule(async () => starts.push(now)),
        limiter.schedule(async () => starts.push(now)),
        limiter.schedule(async () => starts.push(now))
    ])

    assert.deepStrictEqual(starts, [0, 1_000, 2_000])
})

test('rate limiter keeps working after a failed task', async () => {
    let now = 0
    const limiter = createRateLimiter({
        minIntervalMs: 500,
        clock: () => now,
        sleep: async ms => {
            now += ms
        }
    })

    await assert.rejects(() => limiter.schedule(async () => {
        throw new Error('boom')
    }), /boom/)

    const result = await limiter.schedule(async () => 'ok')
    assert.strictEqual(result, 'ok')
})
