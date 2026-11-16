"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { RefreshCwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { strings } from "@/lib/i18n/ro"

type RetryButtonProps = {
  onRetry?: () => void
}

export function RetryButton({ onRetry }: RetryButtonProps = {}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const retry = () => {
    startTransition(() => {
      onRetry?.()
      router.refresh()
    })
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={retry}
      disabled={isPending}
      aria-busy={isPending}
    >
      <RefreshCwIcon
        className={isPending ? "animate-spin" : undefined}
        aria-hidden="true"
      />
      {strings.states.retry}
    </Button>
  )
}
