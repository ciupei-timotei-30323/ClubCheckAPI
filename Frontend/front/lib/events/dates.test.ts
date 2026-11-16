import { describe, expect, it } from "vitest"

import {
  addDays,
  formatDateOnly,
  formatDateRange,
  formatEventRange,
  getWeekendRange,
  isEventEnded,
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

describe("event date ranges", () => {
  it("formats same-day events as a time range", () => {
    const label = formatEventRange(
      "2026-11-16T17:00:00.000Z",
      "2026-11-16T19:00:00.000Z"
    )

    expect(label).toContain("16 noiembrie 2026")
    expect(label).toContain("19:00")
    expect(label).toContain("21:00")
  })

  it("formats multi-day events with both days", () => {
    const label = formatEventRange(
      "2026-11-16T17:00:00.000Z",
      "2026-11-18T19:00:00.000Z"
    )

    expect(label).toContain("16 noiembrie 2026")
    expect(label).toContain("18 noiembrie 2026")
  })

  it("falls back to the start when the end is missing or invalid", () => {
    const start = "2026-11-16T17:00:00.000Z"
    const expected = formatEventRange(start, null)

    expect(formatEventRange(start, "")).toBe(expected)
    expect(formatEventRange(start, "not-a-date")).toBe(expected)
    expect(formatEventRange(start, "2026-11-15T17:00:00.000Z")).toBe(expected)
  })
})

describe("event ended state", () => {
  const now = new Date("2026-11-16T20:00:00.000Z")

  it("detects an end date in the past", () => {
    expect(
      isEventEnded(
        "2026-11-16T17:00:00.000Z",
        "2026-11-16T19:00:00.000Z",
        now
      )
    ).toBe(true)
  })

  it("falls back to the start date when the end date is missing", () => {
    expect(
      isEventEnded("2026-11-16T19:00:00.000Z", null, now)
    ).toBe(true)
    expect(
      isEventEnded("2026-11-16T21:00:00.000Z", undefined, now)
    ).toBe(false)
  })

  it("does not classify future or invalid dates as ended", () => {
    expect(
      isEventEnded(
        "2026-11-16T17:00:00.000Z",
        "2026-11-16T21:00:00.000Z",
        now
      )
    ).toBe(false)
    expect(isEventEnded("not-a-date", null, now)).toBe(false)
    expect(
      isEventEnded(
        "2026-11-16T21:00:00.000Z",
        "not-a-date",
        now
      )
    ).toBe(false)
  })
})
