import type { EventFilterOptions } from "@/lib/api/main/types"
import type { EventFilters } from "@/lib/events/filters"
import { strings } from "@/lib/i18n/ro"

import { CityCombobox } from "./city-combobox"
import { DateFilter } from "./date-filter"
import { GenrePills } from "./genre-pills"
import { VenueCombobox } from "./venue-combobox"

type FilterBarProps = {
  filters: EventFilters
  facets: EventFilterOptions
}

export function FilterBar({ filters, facets }: FilterBarProps) {
  return (
    <section
      aria-label={strings.filters.label}
      className="mb-6 flex flex-col gap-3 border-b border-border pb-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <CityCombobox value={filters.city} items={facets.cities ?? []} />
        <VenueCombobox value={filters.venue} items={facets.venues ?? []} />
        <DateFilter from={filters.from} to={filters.to} />
      </div>

      <GenrePills value={filters.genres} items={facets.genres ?? []} />
    </section>
  )
}
