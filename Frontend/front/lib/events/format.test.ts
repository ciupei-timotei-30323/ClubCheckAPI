import { describe, expect, it } from "vitest"

import { formatEventLocation, formatPrice } from "./format"

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
