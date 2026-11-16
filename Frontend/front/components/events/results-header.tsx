import Link from "next/link"
import { XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { getFilterChips, type EventFilters } from "@/lib/events/filters"
import { cn } from "@/lib/utils"
import { LOCALE, strings } from "@/lib/i18n/ro"

type ResultsHeaderProps = {
  totalCount: number
  filters: EventFilters
}

export function ResultsHeader({ totalCount, filters }: ResultsHeaderProps) {
  const chips = getFilterChips(filters)
  const formattedCount = new Intl.NumberFormat(LOCALE).format(totalCount)

  return (
    <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <h2 className="shrink-0 text-sm font-medium whitespace-nowrap tabular-nums">
        {strings.results.count(formattedCount, totalCount === 1)}
      </h2>

      {chips.length > 0 && (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <Badge
              key={chip.key}
              variant="outline"
              render={
                <Link href={chip.href} aria-label={chip.ariaLabel} />
              }
              className="h-6 max-w-64 gap-1 pr-1.5"
            >
              <span className="truncate">{chip.label}</span>
              <XIcon className="size-3 shrink-0" aria-hidden="true" />
            </Badge>
          ))}

          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost", size: "xs" }),
              "text-muted-foreground"
            )}
          >
            {strings.filters.clearAll}
          </Link>
        </div>
      )}
    </div>
  )
}
