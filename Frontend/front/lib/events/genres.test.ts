import { describe, expect, it } from "vitest"

import { findMatchingGenres, normalizeGenreName } from "./genres"

describe("normalizeGenreName", () => {
  it("ignores case, diacritics and extra whitespace", () => {
    expect(normalizeGenreName("  MUZICĂ   de   Petrecere  ")).toBe(
      "muzica de petrecere"
    )
  })
})

describe("findMatchingGenres", () => {
  it("matches a genre case-insensitively", () => {
    expect(findMatchingGenres("house", ["House", "Techno"])).toEqual([
      "House",
    ])
  })

  it("matches genre names with diacritics", () => {
    expect(
      findMatchingGenres("muzica", [
        "Muzică",
        "Muzica",
        "Muzica de petrecere",
      ])
    ).toEqual(["Muzică", "Muzica"])
  })

  it("returns all matching case variants", () => {
    expect(findMatchingGenres("manele", ["Manele", "manele", "Techno"])).toEqual(
      ["Manele", "manele"]
    )
  })

  it("does not match partial genre names", () => {
    expect(findMatchingGenres("house", ["House Music", "Tech House"])).toEqual(
      []
    )
  })

  it("returns no matches for an empty query", () => {
    expect(findMatchingGenres("   ", ["House"])).toEqual([])
  })
})
