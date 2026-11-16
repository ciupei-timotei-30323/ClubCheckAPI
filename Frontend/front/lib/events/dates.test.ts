import { describe, expect, it } from "vitest"

import {
  addDays,
  formatDateOnly,
  formatDateRange,
  getWeekendRange,
  isDateOnly,
  parseDateOnly,
  toApiEnd,
  toApiStart,
} from "./dates"

describe("date-only helpers", () => {
  it("round-trips valid dates and rejects invalid calendar dates", () => {
    expect(isDateOnly("2025-11-16")).toBe(true)
    expect(isDateOnly("2024-02-29")).toBe(true)
    expect(isDateOnly("2025-02-29")).toBe(false)
    expect(isDateOnly("2025-02-30")).toBe(false)
    expect(isDateOnly("16-11-2025")).toBe(false)
  })

  it("adds days across month and year boundaries", () => {
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01")
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28")
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29")
  })

  it("formats ranges and single days", () => {
    expect(formatDateRange("2025-11-16", "2025-11-18")).toContain("2025")
    expect(formatDateRange("2025-11-16", "2025-11-16")).toBe(
      formatDateRange("2025-11-16", "")
    )
    expect(formatDateRange("", "")).toBe("")
  })

  it("parses and formats the same calendar day independent of timezone", () => {
    expect(formatDateOnly(parseDateOnly("2025-11-16"))).toBe("2025-11-16")
  })
})

describe("weekend preset", () => {
  it("returns the upcoming weekend from a weekday", () => {
    expect(getWeekendRange("2025-11-17")).toEqual({
      from: "2025-11-22",
      to: "2025-11-23",
    })
  })

  it("returns the current weekend on Saturday and Sunday", () => {
    expect(getWeekendRange("2025-11-22")).toEqual({
      from: "2025-11-22",
      to: "2025-11-23",
    })
    expect(getWeekendRange("2025-11-23")).toEqual({
      from: "2025-11-22",
      to: "2025-11-23",
    })
  })
})

describe("Bucharest day boundaries", () => {
  it("uses winter time (UTC+2)", () => {
    expect(toApiStart("2025-11-16")).toBe("2025-11-15T22:00:00.000Z")
    expect(toApiEnd("2025-11-16")).toBe("2025-11-16T21:59:59.999Z")
  })

  it("uses summer time (UTC+3)", () => {
    expect(toApiStart("2025-07-01")).toBe("2025-06-30T21:00:00.000Z")
    expect(toApiEnd("2025-07-01")).toBe("2025-07-01T20:59:59.999Z")
  })

  it("handles the spring DST changeover day", () => {
    expect(toApiStart("2025-03-30")).toBe("2025-03-29T22:00:00.000Z")
    expect(toApiEnd("2025-03-30")).toBe("2025-03-30T20:59:59.999Z")
  })

  it("handles the autumn DST changeover day", () => {
    expect(toApiStart("2025-10-26")).toBe("2025-10-25T21:00:00.000Z")
    expect(toApiEnd("2025-10-26")).toBe("2025-10-26T21:59:59.999Z")
  })

  it("makes the end exactly one millisecond before the next day starts", () => {
    expect(
      new Date(toApiEnd("2025-10-26")).getTime() -
        new Date(toApiStart("2025-10-27")).getTime()
    ).toBe(-1)
  })
})
