import { TriangleAlertIcon } from "lucide-react"

import { strings } from "@/lib/i18n/ro"

import { RetryButton } from "./retry-button"

export function ErrorState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border px-6 py-16 text-center">
      <TriangleAlertIcon
        className="size-8 text-destructive"
        aria-hidden="true"
      />
      <div className="space-y-1">
        <h2 className="font-medium">{strings.states.errorTitle}</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {strings.states.errorDescription}
        </p>
      </div>
      <div className="mt-1">
        <RetryButton />
      </div>
    </div>
  )
}
