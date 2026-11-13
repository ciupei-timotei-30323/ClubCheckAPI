export class MusicBrainzApiError extends Error {
    constructor(message, { statusCode, cause, method, url, responseBody } = {}) {
        super(message, { cause })
        this.name = this.constructor.name
        this.statusCode = statusCode
        this.method = method
        this.url = url
        this.responseBody = responseBody
    }
}

const DEFAULT_INCLUDES = 'aliases+annotation+genres+ratings+tags+url-rels+artist-rels+label-rels+work-rels'
const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504])

function escapeLucene(value) {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function parseRetryAfter(value) {
    if (!value) {
        return null
    }

    const seconds = Number(value)
    if (Number.isFinite(seconds)) {
        return Math.max(0, seconds * 1_000)
    }

    const date = Date.parse(value)
    return Number.isNaN(date) ? null : Math.max(0, date - Date.now())
}

/**
 * Small MusicBrainz client. The HTTP client, rate limiter and user agent are
 * injected, so the module remains testable and has no global mutable state.
 */
export function createMusicBrainzClient({
    httpClient,
    baseUrl = 'https://musicbrainz.org/ws/2',
    userAgent,
    rateLimiter,
    logger,
    timeoutMs = 15_000,
    maxRetries = 2,
    retryDelayMs = 2_000,
    sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
    includes = DEFAULT_INCLUDES
}) {
    if (!httpClient) {
        throw new Error('createMusicBrainzClient requires an httpClient')
    }

    if (!userAgent) {
        throw new Error('createMusicBrainzClient requires a MusicBrainz user agent')
    }

    if (!rateLimiter?.schedule) {
        throw new Error('createMusicBrainzClient requires a rateLimiter')
    }

    if (!logger) {
        throw new Error('createMusicBrainzClient requires a logger')
    }

    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
    const headers = {
        Accept: 'application/json',
        'User-Agent': userAgent
    }

    function buildUrl(path, params = {}) {
        const url = new URL(path.replace(/^\/+/, ''), normalizedBaseUrl)

        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.set(key, String(value))
            }
        }

        return url.toString()
    }

    async function executeWithRetry(url) {
        let attempt = 0

        while (true) {
            try {
                return await requestOnce(url)
            } catch (error) {
                const statusCode = error.response?.status
                const retryable = !statusCode || RETRYABLE_STATUS_CODES.has(statusCode)

                if (!retryable || attempt >= maxRetries) {
                    logger.error(
                        { err: error, url, statusCode, attempt },
                        'MusicBrainz request failed'
                    )
                    throw new MusicBrainzApiError('MusicBrainz request failed', {
                        statusCode,
                        cause: error,
                        method: 'GET',
                        url,
                        responseBody: error.response?.data
                    })
                }

                const retryAfterMs = parseRetryAfter(error.response?.headers?.['retry-after'])
                const waitMs = retryAfterMs ?? retryDelayMs * (2 ** attempt)

                logger.warn(
                    { url, statusCode, attempt: attempt + 1, waitMs },
                    'Retrying MusicBrainz request'
                )
                await sleep(waitMs)
                attempt += 1
            }
        }
    }

    function requestOnce(url) {
        return rateLimiter.schedule(async () => {
            const response = await httpClient.get(url, { headers, timeout: timeoutMs })
            return response.data
        })
    }

    function get(path, params) {
        return executeWithRetry(buildUrl(path, params))
    }

    async function searchArtists(name, { limit = 5 } = {}) {
        const data = await get('artist', {
            query: `artist:"${escapeLucene(name)}"`,
            fmt: 'json',
            limit
        })

        return Array.isArray(data?.artists) ? data.artists : []
    }

    function lookupArtist(mbid) {
        return get(`artist/${encodeURIComponent(mbid)}`, {
            fmt: 'json',
            inc: includes
        })
    }

    return {
        searchArtists,
        lookupArtist
    }
}
