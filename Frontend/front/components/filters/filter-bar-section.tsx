import { fetchFacets, emptyFacets } from "@/lib/api/main/facets"
import type { EventFilters } from "@/lib/events/filters"

import { FilterBar } from "./filter-bar"

type FilterBarSectionProps = {
  filters: EventFilters
}

export async function FilterBarSection({ filters }: FilterBarSectionProps) {
  const facetsResult = await fetchFacets()
  const facets =
    facetsResult.status === "ok" ? facetsResult.data : emptyFacets()

  return <FilterBar filters={filters} facets={facets} />
}
