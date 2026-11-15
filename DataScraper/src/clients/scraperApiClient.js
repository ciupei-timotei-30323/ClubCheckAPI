import { normalizeIncludeTags } from '../utils/includeTags.js'

export class ScraperApiError extends Error {
    constructor(message, {
        statusCode,
        cause,
        method,
        path,
        payload,
        responseBody,
        firecrawlErrorId,
        attempts
    } = {}) {
        super(message, { cause })
        this.name = this.constructor.name
        this.statusCode = statusCode
        this.method = method
        this.path = path
        this.payload = payload
        this.responseBody = responseBody
        this.firecrawlErrorId = firecrawlErrorId
        this.attempts = attempts
    }
}

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504])
const RETRYABLE_NETWORK_CODES = new Set(['ECONNABORTED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'])

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

function isRetryableError(error) {
    const statusCode = error.response?.status

    if (statusCode) {
        return RETRYABLE_STATUS_CODES.has(statusCode)
    }

    return !error.code || RETRYABLE_NETWORK_CODES.has(error.code)
}

function extractFirecrawlErrorId(responseBody, headers = {}) {
    return responseBody?.errorId ??
        responseBody?.error_id ??
        responseBody?.requestId ??
        responseBody?.request_id ??
        responseBody?.id ??
        responseBody?.error?.errorId ??
        responseBody?.error?.id ??
        headers['x-request-id'] ??
        headers['x-firecrawl-request-id'] ??
        null
}

function extractFirecrawlError(responseBody) {
    if (!responseBody) {
        return null
    }

    if (typeof responseBody === 'string') {
        return responseBody
    }

    const error = responseBody.error

    if (error && typeof error === 'object') {
        return error.message ?? error.detail ?? error.code ?? null
    }

    return error ??
        responseBody.message ??
        responseBody.details ??
        responseBody.detail ??
        null
}

export function buildBasicAuthorization(username, password) {
    return `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`
}

/**
 * Client for Firecrawl's /v2 map and scrape endpoints. Every request uses HTTP
 * Basic Auth, and scrape requests include an explicit Firecrawl timeout so its
 * internal Playwright default does not abort slower pages early.
 */
export function createScraperApiClient({
    httpClient,
    baseUrl,
    username,
    password,
    logger,
    timeoutMs = 60_000,
    scrapeTimeoutMs = 30_000,
    maxRetries = 1,
    retryDelayMs = 2_000,
    sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
}) {
    if (!httpClient) {
        throw new Error('createScraperApiClient requires an httpClient')
    }

    if (!baseUrl) {
        throw new Error('createScraperApiClient requires a baseUrl')
    }

    if (!username || !password) {
        throw new Error('createScraperApiClient requires SCRAPER_USERNAME and SCRAPER_PASSWORD')
    }

    if (!logger) {
        throw new Error('createScraperApiClient requires a logger')
    }

    const normalizedBaseUrl = baseUrl.replace(/\/+$/, '')
    const authorization = buildBasicAuthorization(username, password)

    async function post(path, body) {
        const url = `${normalizedBaseUrl}/${path.replace(/^\/+/, '')}`
        let attempt = 0

        while (true) {
            try {
                logger.debug(
                    {
                        method: 'POST',
                        path,
                        payload: body,
                        attempt: attempt + 1
                    },
                    'Sending scraping API request'
                )

                const response = await httpClient.request({
                    method: 'POST',
                    url,
                    data: body,
                    timeout: timeoutMs,
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        Authorization: authorization
                    }
                })

                logger.debug(
                    { method: 'POST', path, status: response.status, attempt: attempt + 1 },
                    'Scraping API request succeeded'
                )
                return response.data
            } catch (error) {
                const statusCode = error.response?.status
                const responseBody = error.response?.data
                const firecrawlErrorId = extractFirecrawlErrorId(responseBody, error.response?.headers)
                const firecrawlError = extractFirecrawlError(responseBody)
                const retryable = isRetryableError(error)
                const attempts = attempt + 1

                if (!retryable || attempt >= maxRetries) {
                    logger.error(
                        {
                            method: 'POST',
                            path,
                            statusCode,
                            errorCode: error.code,
                            errorMessage: error.message,
                            attempts,
                            firecrawlErrorId,
                            firecrawlError,
                            payload: body,
                            responseBody
                        },
                        'Scraping API request failed'
                    )

                    throw new ScraperApiError(`Scraping API POST ${path} failed`, {
                        statusCode,
                        cause: error,
                        method: 'POST',
                        path,
                        payload: body,
                        responseBody,
                        firecrawlErrorId,
                        attempts
                    })
                }

                const retryAfterMs = parseRetryAfter(error.response?.headers?.['retry-after'])
                const waitMs = retryAfterMs ?? retryDelayMs * (2 ** attempt)

                logger.warn(
                    {
                        method: 'POST',
                        path,
                        statusCode,
                        errorCode: error.code,
                        errorMessage: error.message,
                        attempt: attempts,
                        maxRetries,
                        waitMs,
                        firecrawlErrorId,
                        firecrawlError,
                        payload: body
                    },
                    'Retrying scraping API request'
                )

                await sleep(waitMs)
                attempt += 1
            }
        }
    }

    return {
        mapSource: url => post('/map', { url }),
        discoverLinks: url => post('/scrape', {
            url,
            formats: ['links'],
            timeout: scrapeTimeoutMs
        }),
        scrapePage: (url, includeTags) => post('/scrape', {
            url,
            includeTags: normalizeIncludeTags(includeTags),
            timeout: scrapeTimeoutMs
        })
    }
}
