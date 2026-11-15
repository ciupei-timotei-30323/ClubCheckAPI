import test from 'node:test'
import assert from 'node:assert'
import {
    createGroqClassificationService,
    GROQ_CLASSIFICATION_SYSTEM_PROMPT
} from '../inferences/groqClassification.js'

function createLogger() {
    return {
        child() {
            return {
                info() {},
                warn() {},
                error() {}
            }
        }
    }
}

function createGroqClient(content, usage) {
    const calls = []
    return {
        calls,
        chat: {
            completions: {
                async create(params) {
                    calls.push(params)
                    return {
                        choices: [{ message: { content } }],
                        usage
                    }
                }
            }
        }
    }
}

function createTokenLimiter() {
    const reservations = []
    return {
        reservations,
        async acquire(tokens) {
            const reservation = {
                tokens,
                actual: null,
                released: false
            }
            reservations.push(reservation)
            return {
                reconcile(actualTokens) {
                    reservation.actual = actualTokens
                },
                release() {
                    reservation.released = true
                }
            }
        }
    }
}

test('Groq classification uses the expected model and prompt and parses the result', async () => {
    const groqClient = createGroqClient('{"results":[{"id":1,"music":true}]}')
    const tokenLimiter = createTokenLimiter()
    const service = createGroqClassificationService({
        groqClient,
        logger: createLogger(),
        tokensPerMinuteLimiter: tokenLimiter,
        model: 'openai/gpt-oss-20b'
    })

    const result = await service.classify({
        text: 'A live concert',
        sourceUrl: 'https://source.example/event'
    })

    assert.strictEqual(result.music, true)
    const request = groqClient.calls[0]
    assert.strictEqual(request.model, 'openai/gpt-oss-20b')
    assert.strictEqual(request.messages[0].content, GROQ_CLASSIFICATION_SYSTEM_PROMPT)
    assert.match(request.messages[1].content, /Source URL: https:\/\/source\.example\/event/)
    assert.strictEqual(request.stream, false)
    assert.strictEqual(request.temperature, 1)
    assert.strictEqual(request.max_completion_tokens, 2_048)
    assert.strictEqual(tokenLimiter.reservations.length, 1)
    assert.ok(tokenLimiter.reservations[0].tokens > request.max_completion_tokens)
    assert.strictEqual(
        tokenLimiter.reservations[0].actual,
        tokenLimiter.reservations[0].tokens
    )
})

test('Groq classification reconciles the reserved budget with actual usage', async () => {
    const tokenLimiter = createTokenLimiter()
    const service = createGroqClassificationService({
        groqClient: createGroqClient(
            '{"results":[{"id":1,"music":true}]}',
            { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 }
        ),
        logger: createLogger(),
        tokensPerMinuteLimiter: tokenLimiter
    })

    await service.classify({ text: 'Live concert', sourceUrl: 'https://source.example' })

    assert.strictEqual(tokenLimiter.reservations[0].actual, 120)
})

test('Groq classification releases its token reservation when the request fails', async () => {
    const tokenLimiter = createTokenLimiter()
    const groqClient = {
        chat: {
            completions: {
                async create() {
                    throw new Error('rate limited')
                }
            }
        }
    }
    const service = createGroqClassificationService({
        groqClient,
        logger: createLogger(),
        tokensPerMinuteLimiter: tokenLimiter
    })

    await assert.rejects(
        () => service.classify({ text: 'Live concert', sourceUrl: 'https://source.example' }),
        /classification request failed/
    )

    assert.strictEqual(tokenLimiter.reservations[0].released, true)
})

test('Groq classification accepts fenced JSON', async () => {
    const service = createGroqClassificationService({
        groqClient: createGroqClient('```json\n{"results":[{"id":1,"music":false}]}\n```'),
        logger: createLogger(),
        tokensPerMinuteLimiter: createTokenLimiter()
    })

    const result = await service.classify({
        text: 'A theatre play',
        sourceUrl: 'https://source.example/play'
    })

    assert.strictEqual(result.music, false)
})

test('Groq classification treats a page as music-related when any event is music', async () => {
    const service = createGroqClassificationService({
        groqClient: createGroqClient('{"results":[{"id":1,"music":false},{"id":2,"music":true}]}'),
        logger: createLogger(),
        tokensPerMinuteLimiter: createTokenLimiter()
    })

    const result = await service.classify({
        text: 'Theatre and concert',
        sourceUrl: 'https://source.example/mixed'
    })

    assert.strictEqual(result.music, true)
})

test('Groq classification rejects malformed responses', async () => {
    const service = createGroqClassificationService({
        groqClient: createGroqClient('not json'),
        logger: createLogger(),
        tokensPerMinuteLimiter: createTokenLimiter()
    })

    await assert.rejects(
        () => service.classify({ text: 'text', sourceUrl: 'https://source.example' }),
        /invalid classification JSON/
    )
})
