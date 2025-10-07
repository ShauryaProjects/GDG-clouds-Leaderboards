"use client"

import { useEffect, useRef } from "react"

export function GradientBackground() {
  const ref = useRef<HTMLDivElement>(null)

  // Create a small number of animated particles for a techy vibe
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const container = el.querySelector(".particles") as HTMLDivElement | null
    if (!container) return
    // Generate minimal particles to keep it light
    for (let i = 0; i < 18; i++) {
      const s = document.createElement("span")
      s.style.left = `${Math.random() * 100}%`
      s.style.top = `${Math.random() * 100}%`
      s.style.animationDelay = `${(Math.random() * 2).toFixed(2)}s`
      s.style.animationDuration = `${(2.5 + Math.random() * 2).toFixed(2)}s`
      container.appendChild(s)
    }
    return () => {
      container.innerHTML = ""
    }
  }, [])

  return (
    <div ref={ref} aria-hidden className="pointer-events-none fixed inset-0 gradient-background -z-10">
      <div className="particles absolute inset-0" />
    </div>
  )
}
