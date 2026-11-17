import { Suspense } from "react"
import Image from "next/image"
import Link from "next/link"
import { connection } from "next/server"
import { ExternalLinkIcon, Music2Icon } from "lucide-react"

import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { toInteger } from "@/lib/api/main/normalize"
import type { PublicEvent } from "@/lib/api/main/types"
import { formatEventRange, isEventEnded } from "@/lib/events/dates"
import { formatPrice, isHttpUrl } from "@/lib/events/format"
import { serializeEventJsonLd } from "@/lib/events/jsonld"
import { strings } from "@/lib/i18n/ro"

import { FavoriteButton } from "./favorite-button"
import { EventRelated } from "./event-related"
import { EventRelatedSkeleton } from "./event-related-skeleton"

const POSTER_SIZES = "(min-width: 1024px) 360px, 100vw"
const DETAIL_LINK =
  "underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

type EventDetailProps = {
  event: PublicEvent
}

export async function EventDetail({ event }: EventDetailProps) {
  await connection()

  const eventId = toInteger(event.id)
  const ended = isEventEnded(event.startDate, event.endDate)
  const dateRange =
    formatEventRange(event.startDate, event.endDate) ||
    strings.card.dateUnknown
  const price = formatPrice(event.price)
  const posterUrl = isHttpUrl(event.posterUrl) ? event.posterUrl : null
  const ticketUrl =
    !ended && isHttpUrl(event.ticketUrl) ? event.ticketUrl : null
  const city = event.city?.trim()
  const venueName = event.venueName.trim()
  const genres = event.genresName?.map((genre) => genre.trim()).filter(Boolean)
  const artists =
    event.artistsSummary
      ?.map((artist) => ({
        name: artist.name.trim(),
        slug: artist.slug,
      }))
      .filter((artist) => Boolean(artist.name)) ?? []
  const description = event.description?.trim()
  const organizer = event.organizer?.trim()

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeEventJsonLd(event) }}
      />

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/" />}>
              {strings.detail.breadcrumb}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="truncate">
              {event.name}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] xl:gap-12">
        <div className="mx-auto w-full max-w-[360px] self-start lg:sticky lg:top-20 lg:mx-0 lg:max-w-none">
          <AspectRatio
            ratio={2 / 3}
            className="overflow-hidden rounded-lg border border-border bg-muted"
          >
            {posterUrl ? (
              <Image
                src={posterUrl}
                alt={strings.card.posterAlt(event.name)}
                fill
                unoptimized
                priority
                sizes={POSTER_SIZES}
                referrerPolicy="no-referrer"
                className="object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <Music2Icon className="size-12" aria-hidden="true" />
              </div>
            )}
          </AspectRatio>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="min-w-0 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {event.name}
            </h1>

            <div className="flex shrink-0 items-center gap-2">
              {ended && (
                <Badge variant="secondary">{strings.detail.ended}</Badge>
              )}
              {eventId !== null && <FavoriteButton id={eventId} />}
            </div>
          </div>

          {genres && genres.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {genres.map((genre) => (
                <Badge
                  key={genre}
                  variant="outline"
                  render={
                    <Link
                      href={`/?genres=${encodeURIComponent(genre)}`}
                      className={DETAIL_LINK}
                    />
                  }
                >
                  {genre}
                </Badge>
              ))}
            </div>
          )}

          <dl className="mt-6 space-y-4 border-y border-border py-5 text-sm">
            <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3">
              <dt className="text-muted-foreground">{strings.detail.when}</dt>
              <dd className="tabular-nums">{dateRange}</dd>
            </div>

            {venueName && (
              <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3">
                <dt className="text-muted-foreground">{strings.detail.where}</dt>
                <dd>
                  <Link
                    href={`/?venue=${encodeURIComponent(venueName)}`}
                    className={DETAIL_LINK}
                  >
                    {venueName}
                  </Link>
                  {city && (
                    <>
                      <span className="text-muted-foreground">, </span>
                      <Link
                        href={`/?city=${encodeURIComponent(city)}`}
                        className={DETAIL_LINK}
                      >
                        {city}
                      </Link>
                    </>
                  )}
                </dd>
              </div>
            )}

            {artists.length > 0 && (
              <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3">
                <dt className="text-muted-foreground">{strings.detail.who}</dt>
                <dd>
                  <ul className="flex flex-wrap gap-1.5">
                    {artists.map((artist) => (
                      <li key={artist.slug || artist.name}>
                        <Badge
                          variant="secondary"
                          render={
                            <Link
                              href={`/?q=${encodeURIComponent(artist.name)}`}
                              className={DETAIL_LINK}
                            />
                          }
                        >
                          {artist.name}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}

            {price && (
              <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3">
                <dt className="text-muted-foreground">{strings.detail.price}</dt>
                <dd className="font-medium tabular-nums">{price}</dd>
              </div>
            )}
          </dl>

          {ticketUrl && (
            <div className="mt-6">
              <Button
                size="lg"
                nativeButton={false}
                render={
                  <a
                    href={ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                {strings.detail.buyTickets}
                <ExternalLinkIcon aria-hidden="true" />
              </Button>
            </div>
          )}

          {description && (
            <section className="mt-8 border-t border-border pt-6">
              <h2 className="text-lg font-semibold tracking-tight">
                {strings.detail.about}
              </h2>
              <p className="mt-3 max-w-prose text-sm leading-relaxed break-words whitespace-pre-line text-foreground/90">
                {description}
              </p>
            </section>
          )}

          {organizer && (
            <section className="mt-6 border-t border-border pt-6">
              <h2 className="text-lg font-semibold tracking-tight">
                {strings.detail.organizer}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{organizer}</p>
            </section>
          )}
        </div>
      </div>

      <Suspense fallback={<EventRelatedSkeleton />}>
        <EventRelated event={event} />
      </Suspense>
    </article>
  )
}
