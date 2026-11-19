"use client"

import { useState } from "react"
import type { DateRange } from "react-day-picker"
import { CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import {
  formatDateOnly,
  formatDateRange,
  getBucharestToday,
  getWeekendRange,
  parseDateOnly,
} from "@/lib/events/dates"
import { cn } from "@/lib/utils"
import { strings } from "@/lib/i18n/ro"

import { useFilterNavigation } from "./use-filter-navigation"

type DateFilterProps = {
  from: string
  to: string
}

export function DateFilter({ from, to }: DateFilterProps) {
  const today = getBucharestToday()
  const [open, setOpen] = useState(false)
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(() =>
    toDateRange(from, to)
  )
  const { isPending, updateFilters } = useFilterNavigation()

  const selected = toDateRange(from, to)
  const label =
    from || to ? formatDateRange(from, to) : strings.filters.datePlaceholder

  const applyRange = (nextFrom: string, nextTo: string) => {
    updateFilters({ from: nextFrom, to: nextTo })
    setOpen(false)
  }

  const applyDraft = () => {
    if (!draftRange?.from) {
      return
    }

    const nextFrom = formatDateOnly(draftRange.from)
    const nextTo = draftRange.to
      ? formatDateOnly(draftRange.to)
      : nextFrom

    applyRange(nextFrom, nextTo)
  }

  const clearDates = () => {
    updateFilters({ from: null, to: null })
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)

        if (next) {
          setDraftRange(selected)
        }
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`${strings.filters.date}: ${label}`}
            aria-busy={isPending}
            data-pending={isPending}
            className={cn(
              "max-w-[14rem] justify-start gap-1.5 font-normal",
              isPending && "opacity-60"
            )}
          >
            {isPending ? (
              <Spinner
                className="size-4 shrink-0"
                aria-label={strings.states.loading}
              />
            ) : (
              <CalendarIcon className="size-4 shrink-0" aria-hidden="true" />
            )}
            <span className="truncate">{label}</span>
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col gap-1 border-b p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => applyRange(today, today)}
          >
            {strings.filters.today}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => {
              const weekend = getWeekendRange(today)
              applyRange(weekend.from, weekend.to)
            }}
          >
            {strings.filters.thisWeekend}
          </Button>
        </div>

        <Calendar
          mode="range"
          selected={draftRange}
          onSelect={setDraftRange}
          defaultMonth={selected?.from ?? parseDateOnly(today)}
          numberOfMonths={1}
        />

        <div className="flex items-center justify-between gap-2 border-t p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearDates}
          >
            {strings.filters.clearDates}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={applyDraft}
            disabled={!draftRange?.from}
          >
            {strings.filters.apply}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function toDateRange(from: string, to: string): DateRange | undefined {
  if (!from && !to) {
    return undefined
  }

  return {
    from: from ? parseDateOnly(from) : undefined,
    to: to ? parseDateOnly(to) : undefined,
  }
}
