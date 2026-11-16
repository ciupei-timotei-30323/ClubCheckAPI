import { Suspense } from "react"
import Link from "next/link"

import { AuthMenuSlot } from "@/components/auth/auth-menu-slot"
import {
  SearchInput,
  SearchInputFallback,
} from "@/components/filters/search-input"
import { strings } from "@/lib/i18n/ro"

export function EventsHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label={strings.header.homeLabel}
          className="order-1 flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span
            aria-hidden="true"
            className="inline-flex size-6 items-center justify-center rounded-sm bg-foreground text-xs font-semibold text-background"
          >
            C
          </span>
          <span className="text-lg font-semibold tracking-tight">
            ClubCheck
          </span>
        </Link>

        <div className="order-3 w-full min-w-0 sm:order-2 sm:w-auto sm:flex-1 sm:max-w-xl">
          <Suspense fallback={<SearchInputFallback />}>
            <SearchInput />
          </Suspense>
        </div>

        <div className="order-2 ml-auto sm:order-3 sm:ml-0">
          <AuthMenuSlot />
        </div>
      </div>
    </header>
  )
}
