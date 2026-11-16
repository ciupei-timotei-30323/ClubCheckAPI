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
import type { EventFilterOption } from "@/lib/api/main/types"
import { cn } from "@/lib/utils"
import { strings } from "@/lib/i18n/ro"

import { useFilterNavigation } from "./use-filter-navigation"

type CityComboboxProps = {
  value: string
  items: EventFilterOption[]
}

export function CityCombobox({ value, items }: CityComboboxProps) {
  const id = useId()
  const { isPending, updateFilters } = useFilterNavigation()

  const options = useMemo(() => {
    const names = items.map((item) => item.name).filter(Boolean)

    return value && !names.includes(value) ? [value, ...names] : names
  }, [items, value])

  const unavailable = options.length === 0

  return (
    <div className="min-w-0">
      <Label htmlFor={id} className="sr-only">
        {strings.filters.city}
      </Label>
      <Combobox
        items={options}
        value={value || null}
        onValueChange={(next) => {
          updateFilters({ city: next ?? null })
        }}
        autoHighlight
        disabled={unavailable}
      >
        <ComboboxInput
          id={id}
          placeholder={
            unavailable
              ? strings.filters.optionsUnavailable
              : strings.filters.cityPlaceholder
          }
          showClear
          showTrigger
          aria-busy={isPending}
          className={cn("w-full sm:w-44", isPending && "opacity-60")}
        />
        <ComboboxContent>
          <ComboboxEmpty>{strings.filters.noCityResults}</ComboboxEmpty>
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
