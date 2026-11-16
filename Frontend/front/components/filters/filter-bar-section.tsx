import { emptyFacets, fetchFacets } from "@/lib/api/main/facets"
import type { EventFilterOptions } from "@/lib/api/main/types"
import type { EventFilters } from "@/lib/events/filters"

import { FilterBar } from "./filter-bar"

type FilterBarSectionProps = {
  filters: EventFilters
}

export async function FilterBarSection({ filters }: FilterBarSectionProps) {
  let facets: EventFilterOptions

  try {
    facets = await fetchFacets()
  } catch {
    facets = emptyFacets()
  }

  return <FilterBar filters={filters} facets={facets} />
}
