/**
 * The generated .NET contract allows integers to be serialized as numbers or
 * strings. UI code needs numbers for arithmetic and formatting.
 */
export function toInteger(value: number | string | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.trunc(value) : null
  }

  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  const parsed = Number(trimmed)

  return Number.isInteger(parsed) ? parsed : null
}
