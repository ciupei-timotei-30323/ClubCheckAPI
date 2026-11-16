import Image from "next/image"
import Link from "next/link"
import { Music2Icon } from "lucide-react"

import { AspectRatio } from "@/components/ui/aspect-ratio"
import { toInteger } from "@/lib/api/main/normalize"
import type { PublicEvent } from "@/lib/api/main/types"
import { formatEventDate } from "@/lib/events/dates"
import {
  formatEventLocation,
  formatPrice,
  isHttpUrl,
} from "@/lib/events/format"
import { strings } from "@/lib/i18n/ro"

import { FavoriteButton } from "./favorite-button"

const POSTER_SIZES =
  "(min-width: 1536px) 17vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"

type EventCardProps = {
  event: PublicEvent
  priority?: boolean
}

export function EventCard({ event, priority = false }: EventCardProps) {
  const artists =
    event.artistsSummary
      ?.map((artist) => artist.name)
      .filter(Boolean)
      .join(", ") ?? ""

  const price = formatPrice(event.price)
  const date = formatEventDate(event.startDate)
  const location = formatEventLocation(event.city, event.venueName)
  const posterUrl = isHttpUrl(event.posterUrl) ? event.posterUrl : null
  const eventId = toInteger(event.id)

  return (
    <article className="group relative flex flex-col rounded-md">
      <Link
        href={`/events/${event.slug}`}
        aria-label={event.name}
        className="absolute inset-0 z-0 rounded-md outline-none focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />

      <div className="pointer-events-none relative z-10">
        <AspectRatio
          ratio={2 / 3}
          className="overflow-hidden rounded-md border border-border bg-muted"
        >
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={strings.card.posterAlt(event.name)}
              fill
              unoptimized
              sizes={POSTER_SIZES}
              referrerPolicy="no-referrer"
              priority={priority}
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <Music2Icon className="size-8" aria-hidden="true" />
            </div>
          )}
        </AspectRatio>

        <div className="pt-3">
          <h3 className="line-clamp-2 text-sm leading-snug font-semibold tracking-tight group-hover:underline">
            {event.name}
          </h3>

          <p className="mt-1 text-xs text-muted-foreground tabular-nums">
            {date || strings.card.dateUnknown}
          </p>

          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {location}
          </p>

          <p className="mt-0.5 min-h-4 truncate text-xs text-muted-foreground">
            {artists}
          </p>

          <p className="mt-1.5 min-h-5 text-sm font-medium tabular-nums">
            {price ?? ""}
          </p>
        </div>
      </div>

      {eventId !== null && (
        <FavoriteButton
          id={eventId}
          className="absolute top-2 right-2 z-30"
        />
      )}
    </article>
  )
}
