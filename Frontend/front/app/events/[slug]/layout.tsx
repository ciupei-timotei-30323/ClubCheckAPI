import type { ReactNode } from "react"

import { EventsHeader } from "@/components/events/events-header"

export default function EventLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <EventsHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-16 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
