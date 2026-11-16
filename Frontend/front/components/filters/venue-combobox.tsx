"use client"

import { useId, useMemo } from "react"

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { strings } from "@/lib/i18n/ro"

import { useFilterNavigation } from "./use-filter-navigation"

type VenueComboboxProps = {
  value: string
  items: string[]
}

export function VenueCombobox({ value, items }: VenueComboboxProps) {
  const id = useId()
  const { isPending, updateFilters } = useFilterNavigation()

  const options = useMemo(
    () => (value && !items.includes(value) ? [value, ...items] : items),
    [items, value]
  )

  const unavailable = options.length === 0

  return (
    <div className="min-w-0">
      <Label htmlFor={id} className="sr-only">
        {strings.filters.venue}
      </Label>
      <Combobox
        items={options}
        value={value || null}
        onValueChange={(next) => {
          updateFilters({ venue: next ?? null })
        }}
        autoHighlight
        disabled={unavailable}
      >
        <ComboboxInput
          id={id}
          placeholder={
            unavailable
              ? strings.filters.optionsUnavailable
              : strings.filters.venuePlaceholder
          }
          showClear
          showTrigger
          aria-busy={isPending}
          className={cn("w-full sm:w-48", isPending && "opacity-60")}
        />
        <ComboboxContent>
          <ComboboxEmpty>{strings.filters.noVenueResults}</ComboboxEmpty>
          <ComboboxList>
            {(item: string) => (
              <ComboboxItem key={item} value={item}>
                <span className="truncate">{item}</span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}
