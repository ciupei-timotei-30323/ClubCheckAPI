import { describe, expect, it } from "vitest"

import { DEFAULT_EVENT_FILTERS } from "@/lib/events/filters"

import { toEventsQuery } from "./query"

describe("toEventsQuery", () => {
  it("uses a matched genre instead of text search", () => {
    const query = toEventsQuery(
      { ...DEFAULT_EVENT_FILTERS, q: "House" },
      ["House"]
    )

    expect(query.GenresNames).toEqual(["House"])
    expect(query.Search).toBeUndefined()
  })

  it("combines a matched search genre with selected genres", () => {
    const query = toEventsQuery(
      {
        ...DEFAULT_EVENT_FILTERS,
        q: "House",
        genres: ["Techno"],
      },
      ["House"]
    )

    expect(query.GenresNames).toEqual(["Techno", "House"])
  })

  it("falls back to text search when no genre matches", () => {
    const query = toEventsQuery(
      { ...DEFAULT_EVENT_FILTERS, q: "festival" },
      []
    )

    expect(query.Search).toBe("festival")
    expect(query.GenresNames).toBeUndefined()
  })
})
