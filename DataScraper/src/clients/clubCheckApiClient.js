export class ClubCheckApiError extends Error {
    constructor(message, { statusCode, cause, method, path, responseBody } = {}) {
        super(message, { cause })
        this.name = this.constructor.name
        this.statusCode = statusCode
        this.method = method
        this.path = path
        this.responseBody = responseBody
    }
}

/**
 * Client for the private ClubCheckAPI write endpoints.
 */
export function createClubCheckApiClient({
    httpClient,
    baseUrl,
    apiKey,
    logger,
    timeoutMs = 15_000
}) {
    if (!httpClient) {
        throw new Error('createClubCheckApiClient requires an httpClient')
    }

    if (!baseUrl) {
        throw new Error('createClubCheckApiClient requires a baseUrl')
    }

    if (!apiKey) {
        throw new Error('createClubCheckApiClient requires an apiKey')
    }

    if (!logger) {
        throw new Error('createClubCheckApiClient requires a logger')
    }

    const normalizedBaseUrl = baseUrl.replace(/\/+$/, '')

    async function request(method, path, body) {
        const url = `${normalizedBaseUrl}${path}`

        try {
            const response = await httpClient.request({
                method,
                url,
                data: body,
                timeout: timeoutMs,
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey
                }
            })

            logger.debug(
                { method, path, status: response.status },
                'ClubCheckAPI request succeeded'
            )

            return response.data
        } catch (error) {
            const statusCode = error.response?.status

            logger.error(
                {
                    err: error,
                    method,
                    path,
                    statusCode,
                    responseBody: error.response?.data
                },
                'ClubCheckAPI request failed'
            )

            throw new ClubCheckApiError(`ClubCheckAPI ${method} ${path} failed`, {
                statusCode,
                cause: error,
                method,
                path,
                responseBody: error.response?.data
            })
        }
    }

    return {
        createVenue: dto => request('POST', '/Venues/private', dto),
        createArtist: dto => request('POST', '/Artists/private', dto),
        createGenre: dto => request('POST', '/Genres/private', dto),
        createEvent: dto => request('POST', '/Events/private', dto)
    }
}
