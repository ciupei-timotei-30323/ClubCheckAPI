export class InvalidLocationError extends Error {
    constructor(message, { city, venueName, sourceUrl } = {}) {
        super(message)
        this.name = this.constructor.name
        this.city = city
        this.venueName = venueName
        this.sourceUrl = sourceUrl
    }
}

function normalizeCityKey(value) {
    const raw = String(value ?? '').trim().toLowerCase()
    const normalized = raw
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '')

    return normalized || raw
}

function canonicalValue(value) {
    return typeof value === 'string' && value.trim()
        ? value.trim()
        : null
}

/**
 * Verifies and normalises venue cities against the geocoding API before any
 * venue or event is persisted. A city that cannot be matched is rejected with
 * InvalidLocationError; API/network failures keep their GeocodingApiError so
 * callers can retry transient outages separately.
 */
export function createCityGeocodingService({
    geocodingApiClient,
    logger
}) {
    if (!geocodingApiClient?.searchCity) {
        throw new Error('createCityGeocodingService requires a geocoding API client')
    }

    if (!logger) {
        throw new Error('createCityGeocodingService requires a logger')
    }

    async function normalize(structured, { sourceUrl } = {}) {
        const venues = structured?.venues ?? []

        if (venues.length === 0) {
            return structured
        }

        const log = logger.child({ sourceUrl })
        const cityCache = new Map()
        const normalizedVenues = []
        let changed = false

        for (const venue of venues) {
            const city = canonicalValue(venue?.address?.city)

            if (!city) {
                normalizedVenues.push(venue)
                continue
            }

            const cacheKey = normalizeCityKey(city)
            let location = cityCache.get(cacheKey)

            if (!location) {
                const results = await geocodingApiClient.searchCity(city, { count: 1 })
                const result = Array.isArray(results) ? results[0] : null

                if (!result) {
                    log.warn(
                        { venueName: venue?.name, city },
                        'Venue city could not be verified by the geocoding API'
                    )
                    throw new InvalidLocationError(
                        `Could not verify venue city "${city}"`,
                        {
                            city,
                            venueName: venue?.name,
                            sourceUrl
                        }
                    )
                }

                const canonicalCity = canonicalValue(result.name)

                if (!canonicalCity) {
                    throw new InvalidLocationError(
                        `Geocoding API returned no city name for "${city}"`,
                        {
                            city,
                            venueName: venue?.name,
                            sourceUrl
                        }
                    )
                }

                location = {
                    city: canonicalCity,
                    county: canonicalValue(result.admin1)
                }
                cityCache.set(cacheKey, location)

                log.info(
                    {
                        venueName: venue?.name,
                        requestedCity: city,
                        canonicalCity: location.city,
                        county: location.county
                    },
                    'Venue city normalized'
                )
            }

            normalizedVenues.push({
                ...venue,
                address: {
                    ...venue.address,
                    city: location.city,
                    county: location.county
                }
            })
            changed = true
        }

        return changed
            ? {
                ...structured,
                venues: normalizedVenues
            }
            : structured
    }

    return {
        normalize
    }
}
