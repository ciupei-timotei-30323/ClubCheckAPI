export class GeocodingApiError extends Error {
    constructor(message, { cause, statusCode, city, url, responseBody } = {}) {
        super(message, { cause })
        this.name = this.constructor.name
        this.statusCode = statusCode
        this.city = city
        this.url = url
        this.responseBody = responseBody
    }
}

/**
 * Client for the Open-Meteo geocoding API. The HTTP client and logger are
 * injected so this module stays testable and has no global mutable state.
 */
export function createGeocodingApiClient({
    httpClient,
    baseUrl = 'https://geocoding-api.open-meteo.com/v1/search',
    logger,
    timeoutMs = 15_000,
    language = 'en'
}) {
    if (!httpClient?.get) {
        throw new Error('createGeocodingApiClient requires an httpClient')
    }

    if (!baseUrl) {
        throw new Error('createGeocodingApiClient requires a baseUrl')
    }

    if (!logger) {
        throw new Error('createGeocodingApiClient requires a logger')
    }

    /**
     * Returns an empty array when the API has no matching location. Network and
     * HTTP failures throw GeocodingApiError so callers can distinguish an
     * invalid location from a temporary outage.
     */
    async function searchCity(city, { count = 1, language: requestedLanguage = language } = {}) {
        const name = typeof city === 'string' ? city.trim() : ''

        if (!name) {
            return []
        }

        try {
            const response = await httpClient.get(baseUrl, {
                params: {
                    name,
                    count,
                    format: 'json',
                    ...(requestedLanguage ? { language: requestedLanguage } : {})
                },
                timeout: timeoutMs,
                headers: {
                    Accept: 'application/json'
                }
            })

            const data = response?.data

            if (!data || typeof data !== 'object') {
                throw new Error('Geocoding API returned an invalid response body')
            }

            const results = data.results

            // Open-Meteo omits `results` when nothing matches.
            if (results === undefined) {
                return []
            }

            if (!Array.isArray(results)) {
                throw new Error('Geocoding API returned a non-array results field')
            }

            return results
        } catch (error) {
            const statusCode = error.response?.status

            logger.error(
                {
                    err: error,
                    city: name,
                    statusCode,
                    url: baseUrl
                },
                'Geocoding API request failed'
            )

            throw new GeocodingApiError('Geocoding API request failed', {
                cause: error,
                statusCode,
                city: name,
                url: baseUrl,
                responseBody: error.response?.data
            })
        }
    }

    return {
        searchCity
    }
}
