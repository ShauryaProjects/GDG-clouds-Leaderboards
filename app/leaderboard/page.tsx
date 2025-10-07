"use client"

import { useEffect, useMemo, useRef } from "react"
import useSWR from "swr"
import gsap from "gsap"
import { ThemeToggle } from "@/components/theme-toggle"
import { GradientBackground } from "@/components/gradient-background"
import { LeaderboardTable, type Participant } from "@/components/leaderboard-table"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { getJSON } from "@/lib/storage"

const DATA_KEY = "gcsl-data"

const fetcher = () => getJSON<Participant[]>(DATA_KEY, [])

export default function LeaderboardPage() {
  const { data } = useSWR<Participant[]>(DATA_KEY, fetcher)
  const lb = data ?? []
  const headerRef = useRef<HTMLDivElement>(null)

  // Animate heading on mount
  useEffect(() => {
    if (!headerRef.current) return
    const ctx = gsap.context(() => {
      gsap.from(".headline", { y: 16, opacity: 0, duration: 0.6, ease: "power3.out" })
      gsap.from(".subline", { y: 10, opacity: 0, duration: 0.5, ease: "power2.out", delay: 0.08 })
      gsap.from(".actions", { y: 8, opacity: 0, duration: 0.5, ease: "power2.out", delay: 0.15 })
    }, headerRef)
    return () => ctx.revert()
  }, [])

  // Derived rank data with stable sort
  const ranked = useMemo(() => {
    return [...lb].sort((a, b) => {
      // Rank by SkillBadges desc, then ArcadeGames desc, then name asc
      if (b.SkillBadges !== a.SkillBadges) return b.SkillBadges - a.SkillBadges
      if (b.ArcadeGames !== a.ArcadeGames) return b.ArcadeGames - a.ArcadeGames
      return a.Name.localeCompare(b.Name)
    })
  }, [lb])

  return (
    <main className="relative">
      <GradientBackground />

      <div className="container mx-auto max-w-6xl px-4 py-8 md:py-12">
        <header ref={headerRef} className="mb-6 md:mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="headline text-pretty text-2xl md:text-4xl font-semibold tracking-tight">
              <span className="block">🌩️ Google Cloud Study Labs</span>
              <span className="subline block text-[color:var(--color-muted-foreground)] text-base md:text-xl mt-1">
                🚀 GDG MMMUT Gorakhpur
              </span>
            </h1>
          </div>
          <div className="actions flex items-center gap-2">
            <Link href="/admin" className="hidden md:block">
              <Button className="btn-gradient glow">Admin</Button>
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <LeaderboardTable data={ranked} />

        <div className="mt-6 text-center text-[color:var(--color-muted-foreground)]">
          Data is stored locally. Upload via Admin to update the leaderboard.
        </div>
      </div>
    </main>
  )
}
