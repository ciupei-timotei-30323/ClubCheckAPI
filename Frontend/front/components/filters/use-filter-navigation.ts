"use client"

import { useCallback, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

type FilterUpdateValue = string | string[] | null

export type FilterUpdates = Record<string, FilterUpdateValue>

type UpdateOptions = {
  replace?: boolean
  scroll?: boolean
}

type FilterNavigationOptions = {
  basePath?: string
}

export function useFilterNavigation(options: FilterNavigationOptions = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const targetPath = options.basePath ?? pathname
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const updateFilters = useCallback(
    (updates: FilterUpdates, options: UpdateOptions = {}) => {
      const params = new URLSearchParams(searchParams.toString())

      for (const [key, value] of Object.entries(updates)) {
        params.delete(key)

        if (Array.isArray(value)) {
          for (const item of value) {
            if (item) {
              params.append(key, item)
            }
          }
          continue
        }

        if (value) {
          params.set(key, value)
        }
      }

      params.delete("page")

      const query = params.toString()
      const href = query ? `${targetPath}?${query}` : targetPath

      startTransition(() => {
        if (options.replace) {
          router.replace(href, { scroll: options.scroll ?? false })
          return
        }

        router.push(href, { scroll: options.scroll ?? false })
      })
    },
    [router, searchParams, targetPath]
  )

  const setPage = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString())

      if (page > 1) {
        params.set("page", String(page))
      } else {
        params.delete("page")
      }

      const query = params.toString()
      const href = query ? `${targetPath}?${query}` : targetPath

      startTransition(() => {
        router.push(href, { scroll: true })
      })
    },
    [router, searchParams, targetPath]
  )

  return { isPending, updateFilters, setPage }
}
