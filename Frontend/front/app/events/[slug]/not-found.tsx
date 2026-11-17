import { EmptyState } from "@/components/events/empty-state"
import { strings } from "@/lib/i18n/ro"

export default function EventNotFound() {
  return (
    <div className="py-10">
      <EmptyState
        title={strings.detail.notFoundTitle}
        description={strings.detail.notFoundDescription}
        actionHref="/"
        actionLabel={strings.detail.backToListing}
        headingLevel="h1"
      />
    </div>
  )
}
