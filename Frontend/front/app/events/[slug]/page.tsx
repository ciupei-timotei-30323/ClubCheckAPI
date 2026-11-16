import { Suspense } from "react"
import type { Metadata } from "next"

import { EventDetail } from "@/components/events/event-detail"
import { EventDetailSkeleton } from "@/components/events/event-detail-skeleton"
import { fetchEvent, normalizeSlug } from "@/lib/api/main/events"
import { buildEventMetadata } from "@/lib/events/metadata"

type EventPageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const { slug } = await params
  const event = await fetchEvent(normalizeSlug(slug))

  return buildEventMetadata(event)
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params
  const event = await fetchEvent(normalizeSlug(slug))

  return (
    <Suspense fallback={<EventDetailSkeleton />}>
      <EventDetail event={event} />
    </Suspense>
  )
}
