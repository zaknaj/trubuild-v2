import { useState, useMemo, useRef, useEffect } from "react"
import { CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { CURRENCIES } from "@/lib/countries"
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover"

type Currency = (typeof CURRENCIES)[number]

export function CurrencySelect({
  value,
  onValueChange,
  disabled,
  className,
}: {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedCurrency = CURRENCIES.find((c) => c.code === value)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current)
      }
    }
  }, [])

  // When open, show search value; when closed, show selected currency code
  const displayValue = open ? search : selectedCurrency ? `${selectedCurrency.code}` : ""

  // Custom filtering with priority:
  // 1. Code starts with query
  // 2. Code contains query
  // 3. Name starts with query
  // 4. Name contains query
  const filteredCurrencies = useMemo(() => {
    if (!search.trim()) return [...CURRENCIES]

    const query = search.toLowerCase().trim()

    const codeStartsWith: Currency[] = []
    const codeContains: Currency[] = []
    const nameStartsWith: Currency[] = []
    const nameContains: Currency[] = []

    for (const currency of CURRENCIES) {
      const codeLower = currency.code.toLowerCase()
      const nameLower = currency.name.toLowerCase()

      if (codeLower.startsWith(query)) {
        codeStartsWith.push(currency)
      } else if (codeLower.includes(query)) {
        codeContains.push(currency)
      } else if (nameLower.startsWith(query)) {
        nameStartsWith.push(currency)
      } else if (nameLower.includes(query)) {
        nameContains.push(currency)
      }
    }

    return [...codeStartsWith, ...codeContains, ...nameStartsWith, ...nameContains]
  }, [search])

  // Handle keyboard navigation
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  useEffect(() => {
    setHighlightedIndex(0)
  }, [filteredCurrencies])

  const handleSelect = (currency: Currency) => {
    onValueChange(currency.code)
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
          Math.min(i + 1, filteredCurrencies.length - 1)
        )
        break
      case "ArrowUp":
        e.preventDefault()
        setHighlightedIndex((i) => Math.max(i - 1, 0))
        break
      case "Enter":
        e.preventDefault()
        if (filteredCurrencies[highlightedIndex]) {
          handleSelect(filteredCurrencies[highlightedIndex])
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
            "border-input bg-background focus-within:ring-ring",
            className
          )}
        >
          <span className="text-base leading-none shrink-0">
            {selectedCurrency?.emoji ?? "💰"}
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
              setSearch(selectedCurrency?.code ?? "")
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
            placeholder="Select currency..."
            className="flex-1 bg-transparent outline-none min-w-0 placeholder:text-muted-foreground"
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
          {filteredCurrencies.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No currency found.
            </div>
          ) : (
            filteredCurrencies.map((currency, index) => (
              <button
                key={currency.code}
                type="button"
                data-highlighted={index === highlightedIndex}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none cursor-default",
                  index === highlightedIndex && "bg-muted",
                  value === currency.code && "font-medium"
                )}
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelect(currency)
                }}
              >
                <span>{currency.emoji}</span>
                <span>{currency.code}</span>
                <span className="text-muted-foreground">({currency.name})</span>
                {value === currency.code && (
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
