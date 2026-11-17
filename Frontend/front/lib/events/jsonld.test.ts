import { describe, expect, it } from "vitest"

import type { PublicEvent } from "@/lib/api/main/types"

import { buildEventJsonLd, serializeEventJsonLd } from "./jsonld"

const baseEvent: PublicEvent = {
  id: 1,
  slug: "test-event",
  name: "Test Event",
  startDate: "2026-11-16T17:00:00.000Z",
  description: "Un eveniment de test.",
  organizer: "Organizator Test",
  announcementUrl: "https://example.com/announcement",
  ticketUrl: "https://example.com/tickets",
  posterUrl: "https://example.com/poster.jpg",
  price: { value: 50, currency: "RON" },
  endDate: "2026-11-16T19:00:00.000Z",
  city: "București",
  venueName: "Arenele Romane",
  genresName: ["Rock"],
  artistsSummary: [{ name: "Artist Test", slug: "artist-test" }],
}

const now = new Date("2026-11-16T12:00:00.000Z")

describe("buildEventJsonLd", () => {
  it("includes only populated event fields", () => {
    const jsonLd = buildEventJsonLd(baseEvent, now)

    expect(jsonLd).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Event",
      name: "Test Event",
      startDate: "2026-11-16T17:00:00.000Z",
      endDate: "2026-11-16T19:00:00.000Z",
      eventStatus: "https://schema.org/EventScheduled",
      image: "https://example.com/poster.jpg",
      location: {
        "@type": "Place",
        name: "Arenele Romane",
        address: {
          "@type": "PostalAddress",
          addressLocality: "București",
        },
      },
      performer: [{ "@type": "PerformingGroup", name: "Artist Test" }],
      offers: {
        "@type": "Offer",
        price: 50,
        priceCurrency: "RON",
        url: "https://example.com/tickets",
      },
    })
  })

  it("omits missing city, poster, artists, and price", () => {
    const jsonLd = buildEventJsonLd(
      {
        ...baseEvent,
        city: null,
        posterUrl: null,
        price: null,
        artistsSummary: [],
        endDate: null,
      },
      now
    )

    expect(jsonLd).not.toHaveProperty("image")
    expect(jsonLd).not.toHaveProperty("performer")
    expect(jsonLd).not.toHaveProperty("offers")
    expect(jsonLd).not.toHaveProperty("endDate")
    expect(jsonLd.location).toEqual({
      "@type": "Place",
      name: "Arenele Romane",
    })
  })

  it("omits status and offers for ended events", () => {
    const jsonLd = buildEventJsonLd(
      baseEvent,
      new Date("2026-11-16T20:00:00.000Z")
    )

    expect(jsonLd).not.toHaveProperty("eventStatus")
    expect(jsonLd).not.toHaveProperty("offers")
  })
})

describe("serializeEventJsonLd", () => {
  it("escapes script-closing characters", () => {
    const serialized = serializeEventJsonLd(
      { ...baseEvent, name: "</script><script>alert(1)</script>" },
      now
    )

    expect(serialized).not.toContain("</script>")
    expect(serialized).toContain("\\u003c/script>")
  })
})
