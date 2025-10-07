"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Moon, Sun } from "lucide-react"

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light")

  useEffect(() => {
    try {
      const ls = localStorage.getItem("theme")
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      const initial = (ls as "light" | "dark") || (prefersDark ? "dark" : "light")
      setTheme(initial)
      document.documentElement.classList.toggle("dark", initial === "dark")
    } catch {}
  }, [])

  function toggle() {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    try {
      localStorage.setItem("theme", next)
    } catch {}
    document.documentElement.classList.toggle("dark", next === "dark")
  }

  return (
    <Button onClick={toggle} className="btn-gradient h-9 px-3 glow" aria-label="Toggle theme">
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
