import { describe, expect, it } from "vitest"

import type { PublicEvent } from "@/lib/api/main/types"

import { buildEventMetadata } from "./metadata"

const event: PublicEvent = {
  id: 1,
  slug: "test|event",
  name: "Test Event",
  startDate: "2026-11-16T17:00:00.000Z",
  description:
    "Un eveniment de test cu o descriere suficient de lungă pentru a verifica metadatele.",
  organizer: "Organizator Test",
  announcementUrl: null,
  ticketUrl: "https://example.com/tickets",
  posterUrl: "https://example.com/poster.jpg",
  price: { value: 50, currency: "RON" },
  endDate: null,
  city: "București",
  venueName: "Sala Test",
  genresName: ["Rock"],
  artistsSummary: [],
}

describe("buildEventMetadata", () => {
  it("builds the title, canonical URL, and social images", () => {
    const metadata = buildEventMetadata(event)

    expect(metadata.title).toBe("Test Event – București | ClubCheck")
    expect(metadata.alternates?.canonical).toBe("/events/test%7Cevent")
    expect(metadata.openGraph?.title).toBe(
      "Test Event – București | ClubCheck"
    )
    expect(JSON.stringify(metadata.openGraph?.images)).toContain(
      "https://example.com/poster.jpg"
    )
    expect(metadata.twitter && "card" in metadata.twitter
      ? metadata.twitter.card
      : null
    ).toBe("summary_large_image")
  })

  it("omits the city and falls back to date, venue, and city when needed", () => {
    const metadata = buildEventMetadata({
      ...event,
      city: null,
      description: null,
      posterUrl: null,
    })

    expect(metadata.title).toBe("Test Event | ClubCheck")
    expect(metadata.description).toContain("Sala Test")
    expect(metadata.description).toContain("16 nov. 2026")
    expect(metadata.twitter && "card" in metadata.twitter
      ? metadata.twitter.card
      : null
    ).toBe("summary")
  })
})
