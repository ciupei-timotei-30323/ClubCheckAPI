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
import { InputGroupAddon } from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import type { VenueFilterOption } from "@/lib/api/main/types"
import { cn } from "@/lib/utils"
import { strings } from "@/lib/i18n/ro"

import { useFilterNavigation } from "./use-filter-navigation"

type VenueOption = {
  key: string
  name: string
  city: string | null
}

type VenueComboboxProps = {
  value: string
  items: VenueFilterOption[]
}

export function VenueCombobox({ value, items }: VenueComboboxProps) {
  const id = useId()
  const { isPending, updateFilters } = useFilterNavigation()

  const options = useMemo(() => {
    const result: VenueOption[] = []
    const seen = new Set<string>()

    for (const item of items) {
      const city = item.city ?? null
      const key = `${item.name}\u0000${city ?? ""}`

      if (seen.has(key)) {
        continue
      }

      seen.add(key)
      result.push({ key, name: item.name, city })
    }

    if (value && !result.some((item) => item.name === value)) {
      result.unshift({ key: `selected:${value}`, name: value, city: null })
    }

    return result
  }, [items, value])

  const selected = options.find((item) => item.name === value) ?? null
  const unavailable = options.length === 0

  return (
    <div className="min-w-0">
      <Label htmlFor={id} className="sr-only">
        {strings.filters.venue}
      </Label>
      <Combobox
        items={options}
        value={selected}
        onValueChange={(next) => {
          updateFilters({ venue: next?.name ?? null })
        }}
        itemToStringLabel={(item) => item.name}
        isItemEqualToValue={(item, current) => item.key === current.key}
        filter={(item, query) => {
          const normalized = query.trim().toLocaleLowerCase("ro-RO")

          if (!normalized) {
            return true
          }

          return (
            item.name.toLocaleLowerCase("ro-RO").includes(normalized) ||
            (item.city?.toLocaleLowerCase("ro-RO").includes(normalized) ?? false)
          )
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
          className={cn("w-full sm:w-64", isPending && "opacity-60")}
        >
          {isPending && (
            <InputGroupAddon align="inline-start">
              <Spinner
                className="size-3.5"
                aria-label={strings.states.loading}
              />
            </InputGroupAddon>
          )}
        </ComboboxInput>
        <ComboboxContent>
          <ComboboxEmpty>{strings.filters.noVenueResults}</ComboboxEmpty>
          <ComboboxList>
            {(item: VenueOption) => (
              <ComboboxItem key={item.key} value={item} className="items-start">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{item.name}</span>
                  {item.city && (
                    <span className="truncate text-xs text-muted-foreground">
                      {item.city}
                    </span>
                  )}
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}
