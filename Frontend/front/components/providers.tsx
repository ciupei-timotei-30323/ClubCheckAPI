"use client"

import { useState, type ReactNode } from "react"

import { TooltipProvider } from "@/components/ui/tooltip"
import {
  createStubFavoritesProvider,
  FavoritesContextProvider,
} from "@/lib/favorites/provider"

export function AppProviders({ children }: { children: ReactNode }) {
  const [favorites] = useState(() => createStubFavoritesProvider())

  return (
    <TooltipProvider delay={200}>
      <FavoritesContextProvider value={favorites}>
        {children}
      </FavoritesContextProvider>
    </TooltipProvider>
  )
}
