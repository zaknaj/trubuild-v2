import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

const BG_LOW_RES_IMG = `data:image/jpeg;base64,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`

const HIGH_RES_SRC = "/login-bg.jpg"
let isImageLoaded = false

export function LoginBackground({ className }: { className?: string }) {
  const [isLoaded, setIsLoaded] = useState(isImageLoaded)

  useEffect(() => {
    if (isImageLoaded) return
    const img = new Image()
    img.onload = () => {
      isImageLoaded = true
      setIsLoaded(true)
    }
    img.src = HIGH_RES_SRC
  }, [])

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <img
        src={BG_LOW_RES_IMG}
        alt=""
        className="absolute inset-0 w-full h-full object-cover blur-xl scale-110"
      />
      <img
        src={HIGH_RES_SRC}
        alt=""
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition-opacity duration-1500",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  )
}
