import Link from "next/link"
import { UserIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { strings } from "@/lib/i18n/ro"

export function AuthMenuSlot() {
  return (
    <Link
      href="/login"
      aria-label={strings.auth.signIn}
      className={cn(
        buttonVariants({ variant: "ghost", size: "sm" }),
        "gap-2 text-muted-foreground hover:text-foreground"
      )}
    >
      <UserIcon className="size-4" aria-hidden="true" />
      <span className="hidden sm:inline">{strings.auth.signIn}</span>
    </Link>
  )
}
