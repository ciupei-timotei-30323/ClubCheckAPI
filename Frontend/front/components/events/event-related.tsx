import { connection } from "next/server"

import { fetchEvents } from "@/lib/api/main/events"
import { toInteger } from "@/lib/api/main/normalize"
import type { PublicEvent } from "@/lib/api/main/types"
import { getBucharestToday } from "@/lib/events/dates"
import { DEFAULT_EVENT_FILTERS } from "@/lib/events/filters"
import { strings } from "@/lib/i18n/ro"

import { EventGrid } from "./event-grid"

const RELATED_LIMIT = 6

type EventRelatedProps = {
  event: PublicEvent
}

export async function EventRelated({ event }: EventRelatedProps) {
  await connection()

  const venueName = event.venueName.trim()

  if (!venueName) {
    return null
  }

  const result = await fetchEvents(
    {
      ...DEFAULT_EVENT_FILTERS,
      venue: venueName,
      city: event.city?.trim() ?? "",
      from: getBucharestToday(),
    },
    { pageSize: RELATED_LIMIT + 1 }
  )

  if (result.status !== "ok" || !result.data) {
    return null
  }

  const currentId = toInteger(event.id)
  const events = (result.data.items ?? [])
    .filter(
      (item) => currentId === null || toInteger(item.id) !== currentId
    )
    .slice(0, RELATED_LIMIT)

  if (events.length === 0) {
    return null
  }

  return (
    <section
      aria-labelledby="related-events-heading"
      className="mt-14 border-t border-border pt-8"
    >
      <h2
        id="related-events-heading"
        className="text-xl font-semibold tracking-tight text-balance"
      >
        {strings.detail.related(venueName)}
      </h2>

      <div className="mt-4">
        <EventGrid events={events} />
      </div>
    </section>
  )
}
