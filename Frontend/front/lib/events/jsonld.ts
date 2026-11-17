import type { PublicEvent } from "@/lib/api/main/types"
import { toNumber } from "@/lib/api/main/normalize"

import { isEventEnded } from "./dates"
import { isHttpUrl } from "./format"

const SCHEMA_ORG = "https://schema.org"

type JsonLd = Record<string, unknown>

export function buildEventJsonLd(
  event: PublicEvent,
  now: Date = new Date()
): JsonLd {
  const ended = isEventEnded(event.startDate, event.endDate, now)

  const data: JsonLd = {
    "@context": SCHEMA_ORG,
    "@type": "Event",
    name: event.name,
    startDate: event.startDate,
  }

  // schema.org has no "finished" EventStatusType. Omit the status for past
  // events rather than emitting an invalid value.
  if (!ended) {
    data.eventStatus = `${SCHEMA_ORG}/EventScheduled`
  }

  if (isValidInstant(event.endDate)) {
    data.endDate = event.endDate
  }

  if (isHttpUrl(event.posterUrl)) {
    data.image = event.posterUrl
  }

  const venueName = event.venueName.trim()

  if (venueName) {
    const location: JsonLd = {
      "@type": "Place",
      name: venueName,
    }

    const city = event.city?.trim()

    if (city) {
      location.address = {
        "@type": "PostalAddress",
        addressLocality: city,
      }
    }

    data.location = location
  }

  const performers = event.artistsSummary
    ?.map((artist) => artist.name.trim())
    .filter(Boolean)
    .map((name) => ({
      "@type": "PerformingGroup",
      name,
    }))

  if (performers && performers.length > 0) {
    data.performer = performers
  }

  const price = toNumber(event.price?.value)
  const currency = event.price?.currency?.trim().toUpperCase()

  if (!ended && price !== null && currency) {
    const offer: JsonLd = {
      "@type": "Offer",
      price,
      priceCurrency: currency,
    }

    if (isHttpUrl(event.ticketUrl)) {
      offer.url = event.ticketUrl
    }

    data.offers = offer
  }

  return data
}

export function serializeEventJsonLd(
  event: PublicEvent,
  now: Date = new Date()
): string {
  return JSON.stringify(buildEventJsonLd(event, now)).replace(/</g, "\\u003c")
}

function isValidInstant(value: string | null | undefined): value is string {
  return typeof value === "string" && !Number.isNaN(new Date(value).getTime())
}
