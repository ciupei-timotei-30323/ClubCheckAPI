export const CURRENCY_IDS = Object.freeze({
    EUR: 0,
    RON: 1,
    USD: 2,
    HUF: 3
})

export function normalizeKey(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase()
}

export function toCreateVenueDto(venue) {
    return {
        name: venue.name,
        address: venue.address
            ? {
                zipCode: venue.address.zipCode ?? null,
                number: venue.address.number ?? null,
                street: venue.address.street ?? null,
                city: venue.address.city,
                county: venue.address.county ?? null,
                country: venue.address.country ?? null,
                googleMapsUrl: venue.address.googleMapsUrl ?? null
            }
            : null
    }
}

export function toCreateArtistDto(artist, slug) {
    return {
        name: artist.name,
        slug: slug || artist.slug
    }
}

export function toCreateGenreDto(genre) {
    return {
        name: typeof genre === 'string' ? genre : genre.name
    }
}

export function toCreateEventDto(event, { venueId, genreIds, artistIds }) {
    return {
        name: event.name,
        startDate: event.startDate,
        isActive: event.isActive,
        endDate: event.endDate ?? null,
        description: event.description ?? null,
        price: event.price
            ? {
                value: event.price.value,
                currency: CURRENCY_IDS[event.price.currency] ?? null
            }
            : null,
        ticketUrl: event.ticketUrl ?? null,
        announcementUrl: event.announcementUrl ?? null,
        venueId,
        genresId: [...new Set(genreIds)],
        artistsId: [...new Set(artistIds)]
    }
}
