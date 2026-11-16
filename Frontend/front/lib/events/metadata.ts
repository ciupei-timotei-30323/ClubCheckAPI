import type { Metadata } from "next"

import type { PublicEvent } from "@/lib/api/main/types"
import { strings } from "@/lib/i18n/ro"

import { formatEventDate } from "./dates"
import { isHttpUrl, truncateText } from "./format"

const META_DESCRIPTION_LENGTH = 155

export function buildEventMetadata(event: PublicEvent): Metadata {
  const city = event.city?.trim()
  const title = city
    ? strings.meta.eventTitle(event.name, city)
    : strings.meta.eventTitleWithoutCity(event.name)
  const description = buildDescription(event)
  const canonical = `/events/${encodeURIComponent(event.slug)}`
  const image = isHttpUrl(event.posterUrl) ? event.posterUrl : null

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      siteName: strings.meta.siteName,
      title,
      description,
      url: canonical,
      images: image
        ? [{ url: image, alt: strings.card.posterAlt(event.name) }]
        : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  }
}

function buildDescription(event: PublicEvent): string {
  const description = event.description?.trim()

  if (description) {
    return truncateText(description, META_DESCRIPTION_LENGTH)
  }

  const fallback = [
    formatEventDate(event.startDate),
    event.venueName,
    event.city?.trim(),
  ]
    .filter(Boolean)
    .join(", ")

  return truncateText(fallback, META_DESCRIPTION_LENGTH)
}
