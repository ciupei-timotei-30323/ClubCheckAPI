import Link from "next/link"
import { SearchXIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { strings } from "@/lib/i18n/ro"

type EmptyStateProps = {
  title?: string
  description?: string
  actionHref?: string
  actionLabel?: string
  headingLevel?: "h1" | "h2"
}

export function EmptyState({
  title = strings.states.emptyTitle,
  description = strings.states.emptyDescription,
  actionHref = "/",
  actionLabel = strings.filters.clearAll,
  headingLevel: Heading = "h2",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border px-6 py-16 text-center">
      <SearchXIcon
        className="size-8 text-muted-foreground"
        aria-hidden="true"
      />
      <div className="space-y-1">
        <Heading className="font-medium">{title}</Heading>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      <Link
        href={actionHref}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-1")}
      >
        {actionLabel}
      </Link>
    </div>
  )
}
