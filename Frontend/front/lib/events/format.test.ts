import { describe, expect, it } from "vitest"

import {
  formatEventLocation,
  formatPrice,
  isHttpUrl,
  truncateText,
} from "./format"

describe("formatEventLocation", () => {
  it("omits a null city without a dangling separator", () => {
    expect(formatEventLocation(null, "Arenele Romane")).toBe("Arenele Romane")
    expect(formatEventLocation(undefined, "Arenele Romane")).toBe(
      "Arenele Romane"
    )
    expect(formatEventLocation("", "Arenele Romane")).toBe("Arenele Romane")
  })

  it("joins city and venue", () => {
    expect(formatEventLocation("București", "Arenele Romane")).toBe(
      "București · Arenele Romane"
    )
  })
})

describe("formatPrice", () => {
  it("hides the price when the price is missing", () => {
    expect(formatPrice(null)).toBeNull()
    expect(formatPrice(undefined)).toBeNull()
    expect(formatPrice({ value: undefined, currency: "RON" })).toBeNull()
  })

  it("hides the price when the currency is null", () => {
    expect(formatPrice({ value: 50, currency: null })).toBeNull()
  })

  it("formats a price with a currency", () => {
    const formatted = formatPrice({ value: 50, currency: "RON" })

    expect(formatted).toContain("50")
    expect(formatted).toContain("RON")
  })
})

describe("isHttpUrl", () => {
  it("accepts only absolute http(s) URLs", () => {
    expect(isHttpUrl("https://example.com/tickets")).toBe(true)
    expect(isHttpUrl("http://example.com")).toBe(true)
    expect(isHttpUrl("javascript:alert(1)")).toBe(false)
    expect(isHttpUrl("/relative")).toBe(false)
    expect(isHttpUrl(null)).toBe(false)
    expect(isHttpUrl("not a url")).toBe(false)
  })
})

describe("truncateText", () => {
  it("collapses whitespace and truncates on a word boundary", () => {
    expect(truncateText("  Un   eveniment\ncu detalii  ", 80)).toBe(
      "Un eveniment cu detalii"
    )
    expect(truncateText("Un eveniment cu detalii multe", 15)).toBe(
      "Un eveniment…"
    )
    expect(truncateText("Scurt", 15)).toBe("Scurt")
  })
})
