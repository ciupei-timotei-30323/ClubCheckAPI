"use client"

import { useRouter } from "next/navigation"
import { HeartIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useFavorites } from "@/lib/favorites/provider"
import { strings } from "@/lib/i18n/ro"

type FavoriteButtonProps = {
  id: number
  className?: string
}

export function FavoriteButton({ id, className }: FavoriteButtonProps) {
  const router = useRouter()
  const { isAuthenticated, isFavorite, toggle } = useFavorites()
  const active = isFavorite(id)

  const label = !isAuthenticated
    ? strings.favorites.signIn
    : active
      ? strings.favorites.remove
      : strings.favorites.add

  const handleClick = () => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }

    toggle(id)
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            aria-label={label}
            aria-pressed={active}
            onClick={handleClick}
            className={cn(
              "rounded-full border border-border/70 bg-background/90 shadow-sm backdrop-blur hover:bg-background",
              active && "text-foreground",
              className
            )}
          >
            <HeartIcon
              className={cn("size-4", active && "fill-current")}
              aria-hidden="true"
            />
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
