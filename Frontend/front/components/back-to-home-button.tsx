import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { strings } from "@/lib/i18n/ro"
import { cn } from "@/lib/utils"

type BackToHomeButtonProps = {
  className?: string
}

export function BackToHomeButton({ className }: BackToHomeButtonProps) {
  return (
    <Button
      variant="ghost"
      nativeButton={false}
      render={<Link href="/" />}
      className={cn("group", className)}
    >
      <ArrowLeftIcon className="transition-transform duration-200 group-hover:-translate-x-0.5" />
      {strings.header.backHome}
    </Button>
  )
}
