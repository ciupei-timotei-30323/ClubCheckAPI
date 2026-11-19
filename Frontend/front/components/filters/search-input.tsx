"use client"

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react"
import { useSearchParams } from "next/navigation"
import { SearchIcon, XIcon } from "lucide-react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { strings } from "@/lib/i18n/ro"

import { useFilterNavigation } from "./use-filter-navigation"

const SEARCH_DEBOUNCE_MS = 300

export function SearchInput() {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const searchParams = useSearchParams()
  const urlQuery = searchParams.get("q") ?? ""
  const [value, setValue] = useState(urlQuery)
  const { isPending, updateFilters } = useFilterNavigation({
    basePath: "/",
  })

  useEffect(() => {
    if (document.activeElement === inputRef.current) {
      return
    }

    setValue(urlQuery)
  }, [urlQuery])

  useEffect(() => {
    const nextQuery = value.trim()

    if (nextQuery === urlQuery) {
      return
    }

    const timer = window.setTimeout(() => {
      updateFilters({ q: nextQuery || null }, { replace: true })
    }, SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [updateFilters, urlQuery, value])

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return
    }

    event.preventDefault()
    updateFilters({ q: value.trim() || null }, { replace: true })
  }

  const clear = () => {
    setValue("")
    updateFilters({ q: null }, { replace: true })
    inputRef.current?.focus()
  }

  return (
    <InputGroup
      aria-busy={isPending}
      data-pending={isPending}
      className={cn("h-9 w-full", isPending && "opacity-60")}
    >
      <InputGroupAddon align="inline-start">
        {isPending ? (
          <Spinner
            className="size-4"
            aria-label={strings.states.loading}
          />
        ) : (
          <SearchIcon aria-hidden="true" />
        )}
      </InputGroupAddon>
      <InputGroupInput
        ref={inputRef}
        id={inputId}
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={strings.filters.searchPlaceholder}
        aria-label={strings.filters.searchLabel}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
      />
      {value && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            type="button"
            size="icon-xs"
            onClick={clear}
            aria-label={strings.filters.clearSearch}
          >
            <XIcon aria-hidden="true" />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  )
}

export function SearchInputFallback() {
  return (
    <div
      aria-busy="true"
      className="relative h-9 w-full rounded-md border border-input bg-muted/30"
    >
      <Spinner
        className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-label={strings.states.loading}
      />
    </div>
  )
}
