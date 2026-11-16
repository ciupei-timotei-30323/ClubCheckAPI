"use client"

import { TriangleAlertIcon } from "lucide-react"

import { RetryButton } from "@/components/events/retry-button"
import { strings } from "@/lib/i18n/ro"

type EventErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function EventError({ reset }: EventErrorProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border px-6 py-16 text-center"
    >
      <TriangleAlertIcon
        className="size-8 text-destructive"
        aria-hidden="true"
      />
      <div className="space-y-1">
        <h1 className="font-medium">{strings.detail.errorTitle}</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {strings.detail.errorDescription}
        </p>
      </div>
      <div className="mt-1">
        <RetryButton onRetry={reset} />
      </div>
    </div>
  )
}
