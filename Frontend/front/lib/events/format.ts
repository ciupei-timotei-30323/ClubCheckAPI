import type { PublicEvent } from "@/lib/api/main/types"
import { LOCALE, strings } from "@/lib/i18n/ro"

export function formatEventLocation(
  city: string | null | undefined,
  venueName: string
): string {
  return city ? `${city} · ${venueName}` : venueName
}

export function isHttpUrl(value: string | null | undefined): value is string {
  if (!value) {
    return false
  }

  try {
    const url = new URL(value)

    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export function truncateText(value: string, maxLength: number): string {
  const text = value.replace(/\s+/g, " ").trim()

  if (text.length <= maxLength) {
    return text
  }

  const clipped = text.slice(0, Math.max(0, maxLength - 1)).trimEnd()
  const lastSpace = clipped.lastIndexOf(" ")
  const base = lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped

  return `${base}…`
}

export function formatPrice(price: PublicEvent["price"]): string | null {
  if (
    !price ||
    price.value === null ||
    price.value === undefined ||
    price.value === "" ||
    price.currency === null ||
    price.currency === undefined
  ) {
    return null
  }

  const currency = price.currency.trim().toUpperCase()

  if (!currency) {
    return null
  }

  const value = typeof price.value === "number" ? price.value : Number(price.value)

  if (!Number.isFinite(value)) {
    return null
  }

  try {
    const amount = new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value)

    return strings.price.from(amount)
  } catch {
    const amount = new Intl.NumberFormat(LOCALE, {
      maximumFractionDigits: 2,
    }).format(value)

    return strings.price.from(`${amount} ${currency}`)
  }
}
