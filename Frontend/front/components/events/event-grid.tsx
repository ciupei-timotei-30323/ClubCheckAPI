import type { PublicEvent } from "@/lib/api/main/types"

import { EventCard } from "./event-card"

type EventGridProps = {
  events: PublicEvent[]
}

export function EventGrid({ events }: EventGridProps) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
      {events.map((event, index) => (
        <EventCard
          key={event.slug}
          event={event}
          priority={index < 6}
        />
      ))}
    </div>
  )
}
