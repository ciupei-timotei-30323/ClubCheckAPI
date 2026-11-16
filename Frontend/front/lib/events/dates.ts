import { LOCALE, TIME_ZONE } from "@/lib/i18n/ro"

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

type DatePart = "year" | "month" | "day"
type TimePart = DatePart | "hour" | "minute" | "second"

export function isDateOnly(value: string): boolean {
  if (!DATE_ONLY_PATTERN.test(value)) {
    return false
  }

  return formatDateOnly(parseDateOnly(value)) === value
}

export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number)

  return new Date(year, month - 1, day)
}

export function formatDateOnly(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

export function getBucharestToday(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())

  const part = (type: DatePart) =>
    parts.find((item) => item.type === type)?.value ?? ""

  return `${part("year")}-${part("month")}-${part("day")}`
}

export function addDays(dateOnly: string, days: number): string {
  const date = parseDateOnly(dateOnly)
  date.setDate(date.getDate() + days)

  return formatDateOnly(date)
}

export function getWeekendRange(today: string): { from: string; to: string } {
  const day = parseDateOnly(today).getDay()
  const offsetToSaturday = day === 6 ? 0 : day === 0 ? -1 : 6 - day
  const from = addDays(today, offsetToSaturday)

  return { from, to: addDays(from, 1) }
}

export function toApiStart(dateOnly: string): string {
  return zonedWallClockToUtc(dateOnly)
}

export function toApiEnd(dateOnly: string): string {
  const nextDayStart = toApiStart(addDays(dateOnly, 1))

  return new Date(new Date(nextDayStart).getTime() - 1).toISOString()
}

const EVENT_DATE_FORMATTER = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

const EVENT_CARD_DATE_FORMATTER = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

export function formatEventDate(isoDate: string): string {
  const date = parseInstant(isoDate)

  return date ? EVENT_CARD_DATE_FORMATTER.format(date) : ""
}

export function formatEventRange(
  startIso: string,
  endIso?: string | null
): string {
  const start = parseInstant(startIso)

  if (!start) {
    return ""
  }

  const end = parseInstant(endIso)

  if (!end || end.getTime() < start.getTime()) {
    return EVENT_DATE_FORMATTER.format(start)
  }

  return EVENT_DATE_FORMATTER.formatRange(start, end)
}

export function isEventEnded(
  startDate: string,
  endDate: string | null | undefined,
  now: Date = new Date()
): boolean {
  // The API treats an event without an end date as ending at its start.
  const end = parseInstant(endDate) ?? parseInstant(startDate)

  return end !== null && end.getTime() < now.getTime()
}

function parseInstant(value: string | null | undefined): Date | null {
  if (!value) {
    return null
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDateRange(from: string, to: string): string {
  const fromLabel = from && isDateOnly(from) ? formatDateOnlyLabel(from) : ""
  const toLabel = to && isDateOnly(to) ? formatDateOnlyLabel(to) : ""

  if (fromLabel && toLabel) {
    return fromLabel === toLabel ? fromLabel : `${fromLabel} – ${toLabel}`
  }

  return fromLabel || toLabel
}

function formatDateOnlyLabel(value: string): string {
  if (!isDateOnly(value)) {
    return ""
  }

  const [year, month, day] = value.split("-").map(Number)

  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

/**
 * Converts midnight at the start of a Bucharest calendar day to a UTC ISO
 * string. This avoids relying on the server's local timezone and is DST-safe.
 */
function zonedWallClockToUtc(dateOnly: string): string {
  const [year, month, day] = dateOnly.split("-").map(Number)
  const wallClockAsUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0)

  let instant =
    wallClockAsUtc - getTimeZoneOffsetMs(new Date(wallClockAsUtc))

  // Repeat once so DST transitions are handled correctly.
  instant = wallClockAsUtc - getTimeZoneOffsetMs(new Date(instant))

  return new Date(instant).toISOString()
}

function getTimeZoneOffsetMs(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date)

  const value = (type: TimePart) =>
    Number(parts.find((item) => item.type === type)?.value ?? "0")

  const asUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
    value("second")
  )

  return asUtc + date.getMilliseconds() - date.getTime()
}
