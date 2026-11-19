const DIACRITICS = /[\u0300-\u036f]/g

/**
 * Normalizes a genre name for case- and diacritic-insensitive matching.
 */
export function normalizeGenreName(value: string): string {
  return value
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("ro-RO")
}

/**
 * Returns known genres whose full name matches the search term.
 *
 * Exact matching is intentional: a search term such as "House" becomes the
 * genre filter "House", while arbitrary text keeps using the regular text
 * search. Matching multiple names is useful for case variants such as
 * "Manele" and "manele".
 */
export function findMatchingGenres(
  query: string,
  genreNames: readonly string[]
): string[] {
  const normalizedQuery = normalizeGenreName(query)

  if (!normalizedQuery) {
    return []
  }

  return [
    ...new Set(
      genreNames.filter(
        (name) => normalizeGenreName(name) === normalizedQuery
      )
    ),
  ]
}
