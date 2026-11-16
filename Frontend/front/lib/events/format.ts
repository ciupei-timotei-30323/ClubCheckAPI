import type { PublicEvent } from "@/lib/api/main/types"
import { LOCALE, strings } from "@/lib/i18n/ro"

export function formatPrice(price: PublicEvent["price"]): string | null {
  if (
    !price ||
    price.value === null ||
    price.value === undefined ||
    price.value === ""
  ) {
    return null
  }

  const value = typeof price.value === "number" ? price.value : Number(price.value)

  if (!Number.isFinite(value)) {
    return null
  }

  const currency =
    typeof price.currency === "string" && price.currency.trim()
      ? price.currency.trim().toUpperCase()
      : "RON"

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
