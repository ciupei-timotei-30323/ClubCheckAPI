"use client"

import { createContext, useContext, type ReactNode } from "react"

import type { FavoritesProvider } from "./types"

const FavoritesContext = createContext<FavoritesProvider | null>(null)

export function createStubFavoritesProvider(): FavoritesProvider {
  const favorites = new Set<string>()

  return {
    isAuthenticated: false,
    isFavorite: (id) => favorites.has(id),
    toggle: (id) => {
      if (favorites.has(id)) {
        favorites.delete(id)
        return
      }

      favorites.add(id)
    },
  }
}

export function FavoritesContextProvider({
  value,
  children,
}: {
  value: FavoritesProvider
  children: ReactNode
}) {
  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites(): FavoritesProvider {
  const context = useContext(FavoritesContext)

  if (!context) {
    throw new Error("useFavorites must be used inside FavoritesContextProvider")
  }

  return context
}
