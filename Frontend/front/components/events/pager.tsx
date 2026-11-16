import Link from "next/link"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import {
  buildPageHref,
  type EventFilters,
} from "@/lib/events/filters"
import { cn } from "@/lib/utils"
import { strings } from "@/lib/i18n/ro"

type PagerProps = {
  page: number
  totalPages: number
  filters: EventFilters
}

export function Pager({ page, totalPages, filters }: PagerProps) {
  if (totalPages <= 1) {
    return null
  }

  const currentPage = Math.min(Math.max(page, 1), totalPages)
  const previousHref = buildPageHref(filters, currentPage - 1)
  const nextHref = buildPageHref(filters, currentPage + 1)

  const disabledClasses = cn(
    buttonVariants({ variant: "outline", size: "sm" }),
    "pointer-events-none opacity-50"
  )

  return (
    <nav
      aria-label={strings.results.pagination}
      className="mt-8 flex flex-wrap items-center justify-center gap-3"
    >
      {currentPage > 1 ? (
        <Link
          href={previousHref}
          className={buttonVariants({ variant: "outline", size: "sm" })}
          rel="prev"
        >
          <ChevronLeftIcon aria-hidden="true" />
          {strings.results.previous}
        </Link>
      ) : (
        <span aria-disabled="true" className={disabledClasses}>
          <ChevronLeftIcon aria-hidden="true" />
          {strings.results.previous}
        </span>
      )}

      <span className="text-sm text-muted-foreground tabular-nums">
        {strings.results.pageOf(currentPage, totalPages)}
      </span>

      {currentPage < totalPages ? (
        <Link
          href={nextHref}
          className={buttonVariants({ variant: "outline", size: "sm" })}
          rel="next"
        >
          {strings.results.next}
          <ChevronRightIcon aria-hidden="true" />
        </Link>
      ) : (
        <span aria-disabled="true" className={disabledClasses}>
          {strings.results.next}
          <ChevronRightIcon aria-hidden="true" />
        </span>
      )}
    </nav>
  )
}
