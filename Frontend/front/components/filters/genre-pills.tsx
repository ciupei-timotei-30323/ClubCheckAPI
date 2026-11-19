"use client"

import { useMemo } from "react"

import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { toInteger } from "@/lib/api/main/normalize"
import type { EventFilterOption } from "@/lib/api/main/types"
import { cn } from "@/lib/utils"
import { strings } from "@/lib/i18n/ro"

import { useFilterNavigation } from "./use-filter-navigation"

const MAX_VISIBLE_GENRES = 8

type GenrePillsProps = {
  value: string[]
  items: EventFilterOption[]
}

export function GenrePills({ value, items }: GenrePillsProps) {
  const { isPending, updateFilters } = useFilterNavigation()

  const options = useMemo(() => {
    const orderedNames = [...items]
      .sort((a, b) => {
        const countDifference = (toInteger(b.count) ?? 0) - (toInteger(a.count) ?? 0)

        return countDifference !== 0
          ? countDifference
          : a.name.localeCompare(b.name, "ro")
      })
      .map((item) => item.name)
      .filter(Boolean)

    const visible = orderedNames.slice(0, MAX_VISIBLE_GENRES)
    const selectedButHidden = value.filter((genre) => !visible.includes(genre))

    return [...selectedButHidden, ...visible]
  }, [items, value])

  if (options.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">{strings.filters.noGenres}</p>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ToggleGroup
        multiple
        value={value}
        onValueChange={(next) => {
          updateFilters({ genres: next })
        }}
        aria-label={strings.filters.genres}
        variant="outline"
        size="sm"
        className={cn("flex flex-wrap gap-1.5", isPending && "opacity-60")}
      >
        {options.map((genre) => (
          <ToggleGroupItem
            key={genre}
            value={genre}
            className="rounded-full px-3 text-xs aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
          >
            {genre}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {isPending && (
        <Spinner
          className="size-4 text-muted-foreground"
          aria-label={strings.states.loading}
        />
      )}
    </div>
  )
}
