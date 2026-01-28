import { useState, useMemo, useRef, useEffect } from "react"
import { CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { COUNTRIES } from "@/lib/countries"
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover"

type Country = (typeof COUNTRIES)[number]

export const DEFAULT_COUNTRY_CODE = "SA" as const

export function CountrySelect({
  value,
  onValueChange,
  disabled,
  className,
  variant = "default",
}: {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  className?: string
  variant?: "default" | "dark"
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedCountry = COUNTRIES.find((c) => c.code === value)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current)
      }
    }
  }, [])

  // When open, show search value; when closed, show selected country name
  const displayValue = open ? search : (selectedCountry?.name ?? "")

  // Custom filtering with priority:
  // 1. Exact country code match
  // 2. Countries whose name starts with the query
  // 3. Countries whose name includes the query
  // 4. Country codes that include the query
  const filteredCountries = useMemo(() => {
    if (!search.trim()) return [...COUNTRIES]

    const query = search.toLowerCase().trim()

    const exactCodeMatch: Country[] = []
    const startsWithName: Country[] = []
    const includesName: Country[] = []
    const includesCode: Country[] = []

    for (const country of COUNTRIES) {
      const nameLower = country.name.toLowerCase()
      const codeLower = country.code.toLowerCase()

      if (codeLower === query) {
        exactCodeMatch.push(country)
      } else if (nameLower.startsWith(query)) {
        startsWithName.push(country)
      } else if (nameLower.includes(query)) {
        includesName.push(country)
      } else if (codeLower.includes(query)) {
        includesCode.push(country)
      }
    }

    return [
      ...exactCodeMatch,
      ...startsWithName,
      ...includesName,
      ...includesCode,
    ]
  }, [search])

  // Handle keyboard navigation
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  useEffect(() => {
    setHighlightedIndex(0)
  }, [filteredCountries])

  const handleSelect = (country: Country) => {
    onValueChange(country.code)
    setOpen(false)
    setSearch("")
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
        setOpen(true)
        e.preventDefault()
      }
      return
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setHighlightedIndex((i) =>
          Math.min(i + 1, filteredCountries.length - 1)
        )
        break
      case "ArrowUp":
        e.preventDefault()
        setHighlightedIndex((i) => Math.max(i - 1, 0))
        break
      case "Enter":
        e.preventDefault()
        if (filteredCountries[highlightedIndex]) {
          handleSelect(filteredCountries[highlightedIndex])
        }
        break
      case "Escape":
        setOpen(false)
        setSearch("")
        inputRef.current?.blur()
        break
    }
  }

  // Scroll highlighted item into view
  useEffect(() => {
    if (open && listRef.current) {
      const highlighted = listRef.current.querySelector(
        "[data-highlighted=true]"
      )
      highlighted?.scrollIntoView({ block: "nearest" })
    }
  }, [highlightedIndex, open])

  return (
    <Popover open={open}>
      <PopoverAnchor asChild>
        <div
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-md border px-3 text-sm",
            "focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2",
            disabled && "cursor-not-allowed opacity-50",
            variant === "dark"
              ? "text-white border-white/30 bg-white/20 focus-within:border-white/50 focus-within:ring-white/20"
              : "border-input bg-background focus-within:ring-ring",
            className
          )}
        >
          <span className="text-base leading-none shrink-0">
            {selectedCountry?.emoji ?? "🌐"}
          </span>
          <input
            ref={inputRef}
            type="text"
            disabled={disabled}
            value={displayValue}
            onChange={(e) => {
              setSearch(e.target.value)
              if (!open) setOpen(true)
            }}
            onFocus={() => {
              // Cancel any pending blur
              if (blurTimeoutRef.current) {
                clearTimeout(blurTimeoutRef.current)
                blurTimeoutRef.current = null
              }
              setSearch(selectedCountry?.name ?? "")
              setOpen(true)
            }}
            onBlur={() => {
              // Delay to allow click on item
              blurTimeoutRef.current = setTimeout(() => {
                setOpen(false)
                setSearch("")
              }, 50)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Select country..."
            className={cn(
              "flex-1 bg-transparent outline-none min-w-0",
              variant === "dark"
                ? "placeholder:text-white/40"
                : "placeholder:text-muted-foreground"
            )}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="p-1 max-h-60 overflow-auto"
        style={{ width: "var(--radix-popover-trigger-width)" }}
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div ref={listRef}>
          {filteredCountries.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No country found.
            </div>
          ) : (
            filteredCountries.map((country, index) => (
              <button
                key={country.code}
                type="button"
                data-highlighted={index === highlightedIndex}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none cursor-default",
                  index === highlightedIndex && "bg-muted",
                  value === country.code && "font-medium"
                )}
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelect(country)
                }}
              >
                <span>{country.emoji}</span>
                <span>{country.name}</span>
                {value === country.code && (
                  <CheckIcon className="ml-auto h-4 w-4" />
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
