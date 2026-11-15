export class GroqClassificationError extends Error {
    constructor(message, { cause, rawOutput } = {}) {
        super(message, { cause })
        this.name = this.constructor.name
        this.rawOutput = rawOutput
    }
}

export const GROQ_CLASSIFICATION_SYSTEM_PROMPT = `You classify events. For each event decide if it is a music event (concert, gig, festival with live music, DJ/club night, recital, open mic). Not music: theatre, stand-up, sports, conferences, exhibitions, workshops, unless music is the main attraction. Reply ONLY with JSON: {"results":[{"id":<int>,"music":<true|false>}]}`

function parseJsonOutput(output) {
    const trimmed = String(output ?? '').trim()
    const withoutFence = trimmed.startsWith('```')
        ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
        : trimmed

    try {
        return JSON.parse(withoutFence)
    } catch (error) {
        const start = withoutFence.indexOf('{')
        const end = withoutFence.lastIndexOf('}')

        if (start >= 0 && end > start) {
            return JSON.parse(withoutFence.slice(start, end + 1))
        }

        throw error
    }
}

/**
 * Uses Groq to decide whether a scraped page describes a music event.
 */
export function createGroqClassificationService({
    groqClient,
    logger,
    tokensPerMinuteLimiter,
    model = 'openai/gpt-oss-20b',
    maxInputCharacters = 20_000,
    temperature = 1,
    maxCompletionTokens = 2_048,
    topP = 1,
    reasoningEffort = 'medium'
}) {
    if (!groqClient?.chat?.completions?.create) {
        throw new Error('createGroqClassificationService requires a Groq client')
    }

    if (!logger) {
        throw new Error('createGroqClassificationService requires a logger')
    }

    if (!tokensPerMinuteLimiter?.acquire) {
        throw new Error('createGroqClassificationService requires a tokens-per-minute limiter')
    }

    async function classify({ text, sourceUrl }) {
        const log = logger.child({ sourceUrl, model })

        if (!text?.trim()) {
            log.warn('Skipping Groq classification for empty scraped content')
            return { music: false, reason: 'empty-content' }
        }

        const inputText = text.length > maxInputCharacters
            ? `${text.slice(0, maxInputCharacters)}\n\n[TRUNCATED: ${text.length - maxInputCharacters} characters omitted]`
            : text

        if (inputText.length !== text.length) {
            log.warn(
                { characters: text.length, maxInputCharacters },
                'Scraped content truncated before Groq classification'
            )
        }

        // Estimate conservatively: four characters per token plus the maximum
        // completion budget. The reservation is reconciled with Groq's reported
        // usage after the request.
        const estimatedInputTokens = Math.max(1, Math.ceil(inputText.length / 4))
        const reservedTokens = estimatedInputTokens + maxCompletionTokens
        let reservation

        try {
            reservation = await tokensPerMinuteLimiter.acquire(reservedTokens)
        } catch (error) {
            log.error(
                { err: error, estimatedInputTokens, reservedTokens },
                'Could not reserve Groq token budget'
            )
            throw new GroqClassificationError('Could not reserve Groq token budget', { cause: error })
        }

        log.info(
            { estimatedInputTokens, reservedTokens },
            'Groq token budget acquired'
        )

        let completion
        try {
            completion = await groqClient.chat.completions.create({
                messages: [
                    { role: 'system', content: GROQ_CLASSIFICATION_SYSTEM_PROMPT },
                    {
                        role: 'user',
                        content: `Source URL: ${sourceUrl}\n\n${inputText}`
                    }
                ],
                model,
                temperature,
                max_completion_tokens: maxCompletionTokens,
                top_p: topP,
                stream: false,
                reasoning_effort: reasoningEffort,
                stop: null
            })
        } catch (error) {
            reservation.release()
            log.error({ err: error }, 'Groq classification request failed')
            throw new GroqClassificationError('Groq classification request failed', { cause: error })
        }

        const actualTokens = completion?.usage?.total_tokens
        reservation.reconcile(
            Number.isFinite(Number(actualTokens)) ? Number(actualTokens) : reservedTokens
        )

        log.info(
            {
                estimatedInputTokens,
                reservedTokens,
                actualTokens: Number.isFinite(Number(actualTokens)) ? Number(actualTokens) : null,
                usage: completion?.usage ?? null
            },
            'Groq token usage reconciled'
        )

        const content = completion?.choices?.[0]?.message?.content
        if (!content) {
            throw new GroqClassificationError('Groq returned an empty classification response')
        }

        let parsed
        try {
            parsed = parseJsonOutput(content)
        } catch (error) {
            log.error({ err: error, rawOutput: content }, 'Groq returned invalid classification JSON')
            throw new GroqClassificationError('Groq returned invalid classification JSON', {
                cause: error,
                rawOutput: content
            })
        }

        const results = Array.isArray(parsed?.results) ? parsed.results : []
        const hasBooleanResult = results.some(item => typeof item?.music === 'boolean')

        if (!hasBooleanResult) {
            log.error({ rawOutput: content }, 'Groq classification response has no boolean music field')
            throw new GroqClassificationError('Groq classification response has no boolean music field', {
                rawOutput: content
            })
        }

        // A page may contain more than one event. Treat the page as
        // music-related when at least one classified item is music.
        const music = results.some(item => item?.music === true)

        log.info({ music, results: results.length }, 'Groq classification completed')
        return { music, raw: parsed }
    }

    return {
        classify
    }
}
