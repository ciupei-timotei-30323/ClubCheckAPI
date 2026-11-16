const FALLBACK_SITE_URL = "http://localhost:3000"

export function getSiteUrl(): URL {
  const value = process.env.NEXT_PUBLIC_SITE_URL

  if (value) {
    try {
      return new URL(value)
    } catch {
      // Fall back to the local URL for a malformed value.
    }
  }

  return new URL(FALLBACK_SITE_URL)
}
