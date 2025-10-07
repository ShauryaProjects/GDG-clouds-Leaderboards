"use client"

import { useEffect, useMemo, useRef } from "react"
import useSWR from "swr"
import gsap from "gsap"
import { ThemeToggle } from "@/components/theme-toggle"
import Image from "next/image"
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

      <div className="container mx-auto max-w-6xl px-4 py-8 md:py-12 relative">
        <div className="fixed top-4 right-4 md:top-6 md:right-6 flex items-center gap-2 z-20">
          <Link href="/admin">
            <Button className="btn-gradient glow">Admin</Button>
          </Link>
          <ThemeToggle />
        </div>
        <header ref={headerRef} className="my-10 md:my-15 flex items-start justify-between gap-4">
          <div>
            <div className="headline flex items-center gap-3 md:gap-4">
              <div className="relative rounded-full overflow-hidden ring-1 ring-[color:var(--color-border)] bg-white p-1" style={{width: 72, height: 72}}>
                <Image src="/logo.png" alt="Event logo" fill sizes="72px" className="object-cover" />
              </div>
              <div>
                <h1 className="text-pretty text-4xl md:text-6xl font-extrabold tracking-tight text-[color:var(--color-foreground)] mt-2 mb-2">
                  <span className="block">Google Cloud Study Labs</span>
                </h1>
                <span className="subline block text-base md:text-xl mt-1 text-[color:var(--color-muted-foreground)]">
                  GDG MMMUT Gorakhpur
                </span>
              </div>
            </div>
          </div>
          <div className="actions hidden" />
        </header>

        <LeaderboardTable data={ranked} />

        <div className="mt-6 text-center text-[color:var(--color-muted-foreground)]">
          Data is stored locally. Upload via Admin to update the leaderboard.
        </div>
      </div>
    </main>
  )
}
