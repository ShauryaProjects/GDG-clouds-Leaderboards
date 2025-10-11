"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import useSWR from "swr"
import gsap from "gsap"
import { ThemeToggle } from "@/components/theme-toggle"
import Image from "next/image"
import { GradientBackground } from "@/components/gradient-background"
import { LeaderboardTable, type Participant } from "@/components/leaderboard-table"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { getJSON, setJSON } from "@/lib/storage"

const DATA_KEY = "gcsl-data"
const FIXED_RANKINGS_KEY = "gcsl-fixed-rankings"

const fetcher = async () => {
  try {
    const res = await fetch("/api/leaderboard", { cache: "no-store" })
    if (!res.ok) throw new Error("bad")
    const serverData = (await res.json()) as Participant[]
    if (Array.isArray(serverData) && serverData.length > 0) {
      setJSON<Participant[]>(DATA_KEY, serverData)
      return serverData
    }
    // Server returned empty (e.g., no KV/in-memory reset). Prefer locally cached data.
    return getJSON<Participant[]>(DATA_KEY, [])
  } catch {
    return getJSON<Participant[]>(DATA_KEY, [])
  }
}

const fixedRankingsFetcher = async () => {
  try {
    const res = await fetch("/api/fixed-rankings", { cache: "no-store" })
    if (!res.ok) throw new Error("bad")
    const serverData = (await res.json()) as Record<string, number>
    if (serverData && typeof serverData === "object") {
      setJSON<Record<string, number>>(FIXED_RANKINGS_KEY, serverData)
      return serverData
    }
    return getJSON<Record<string, number>>(FIXED_RANKINGS_KEY, {})
  } catch {
    return getJSON<Record<string, number>>(FIXED_RANKINGS_KEY, {})
  }
}

export default function LeaderboardPage() {
  const { data } = useSWR<Participant[]>(DATA_KEY, fetcher, { revalidateOnFocus: false })
  const { data: fixedRankings } = useSWR<Record<string, number>>(FIXED_RANKINGS_KEY, fixedRankingsFetcher, { revalidateOnFocus: false })
  const lb = data ?? []
  const fixedRanks = fixedRankings ?? {}
  const headerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const [loaderGone, setLoaderGone] = useState(false)

  // Show loader for ~1.9s once on mount, then fade it out and animate header/content in
  useEffect(() => {
    const timer = setTimeout(() => {
      if (overlayRef.current) {
        gsap.to(overlayRef.current, {
          opacity: 0,
          duration: 0.4,
          ease: "power2.out",
          onComplete: () => {
            setLoaderGone(true)
            if (contentRef.current && headerRef.current) {
              gsap.to(contentRef.current, { opacity: 1, duration: 0.4, ease: "power2.out" })
              const ctx = gsap.context(() => {
                gsap.from(".headline", { y: 16, opacity: 0, duration: 0.6, ease: "power3.out" })
                gsap.from(".subline", { y: 10, opacity: 0, duration: 0.5, ease: "power2.out", delay: 0.08 })
                gsap.from(".actions", { y: 8, opacity: 0, duration: 0.5, ease: "power2.out", delay: 0.15 })
              }, headerRef)
              return () => ctx.revert()
            }
          },
        })
      } else {
        setLoaderGone(true)
        if (contentRef.current && headerRef.current) {
          gsap.to(contentRef.current, { opacity: 1, duration: 0.4, ease: "power2.out" })
          const ctx = gsap.context(() => {
            gsap.from(".headline", { y: 16, opacity: 0, duration: 0.6, ease: "power3.out" })
            gsap.from(".subline", { y: 10, opacity: 0, duration: 0.5, ease: "power2.out", delay: 0.08 })
            gsap.from(".actions", { y: 8, opacity: 0, duration: 0.5, ease: "power2.out", delay: 0.15 })
          }, headerRef)
          return () => ctx.revert()
        }
      }
    }, 1900)
    return () => clearTimeout(timer)
  }, [])

  // Derived rank data with updated sort: prioritize fixed rankings first, then completion date for those who
  // completed exactly 19 labs and 1 arcade game; earlier date ranks higher. Then
  // fall back to prior logic (SkillBadges desc, ArcadeGames desc, Name asc).
  const ranked = useMemo(() => {
    const parseIsoOrDdmmyyyy = (value?: string): number | undefined => {
      if (!value) return undefined
      // If already looks like ISO YYYY-MM-DD, Date.parse is safe
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const t = Date.parse(value)
        return Number.isNaN(t) ? undefined : t
      }
      // Try DD/MM/YYYY or DD-MM-YYYY
      const m = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
      if (m) {
        const day = Number(m[1])
        const month = Number(m[2])
        const year = Number(m[3])
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const dt = new Date(Date.UTC(year, month - 1, day))
          const t = dt.getTime()
          return Number.isNaN(t) ? undefined : t
        }
      }
      return undefined
    }

    // First, add fixed ranks to participants who have them
    const participantsWithFixedRanks = lb.map(participant => ({
      ...participant,
      FixedRank: fixedRanks[participant.Email] || undefined
    }))

    return [...participantsWithFixedRanks].sort((a, b) => {
      // If both have fixed ranks, sort by fixed rank
      if (a.FixedRank && b.FixedRank) {
        return a.FixedRank - b.FixedRank
      }
      
      // If only one has a fixed rank, that one comes first
      if (a.FixedRank && !b.FixedRank) return -1
      if (!a.FixedRank && b.FixedRank) return 1

      // If neither has fixed rank, use the original logic
      const aIsTarget = a.SkillBadges === 19 && a.ArcadeGames === 1 && !!a.CompletionDate
      const bIsTarget = b.SkillBadges === 19 && b.ArcadeGames === 1 && !!b.CompletionDate

      // If only one has qualifying completion date, that one comes first
      if (aIsTarget && !bIsTarget) return -1
      if (!aIsTarget && bIsTarget) return 1

      // If both have a qualifying date, earlier date ranks higher
      if (aIsTarget && bIsTarget) {
        const aTime = parseIsoOrDdmmyyyy(a.CompletionDate as string)
        const bTime = parseIsoOrDdmmyyyy(b.CompletionDate as string)
        if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) {
          return (aTime as number) - (bTime as number)
        }
      }

      // Fallback to previous sorting
      if (b.SkillBadges !== a.SkillBadges) return b.SkillBadges - a.SkillBadges
      if (b.ArcadeGames !== a.ArcadeGames) return b.ArcadeGames - a.ArcadeGames
      return a.Name.localeCompare(b.Name)
    })
  }, [lb, fixedRanks])

  return (
    <main className="relative">
      <GradientBackground />

      {/* Loader overlay */}
      {!loaderGone && (
        <div ref={overlayRef} className="fixed inset-0 z-30 flex items-center justify-center bg-[color:var(--color-background)]">
          <div className="relative flex flex-col items-center gap-4">
            {/* Rotating ring + neon pulsing core */}
            <div className="loader-ring">
              <div className="loader-core" />
            </div>
            <span className="text-sm text-[color:var(--color-muted-foreground)] tracking-widest">INITIALIZING</span>
          </div>
        </div>
      )}

      <div ref={contentRef} style={{ opacity: 0 }} className="container mx-auto max-w-6xl px-4 py-8 md:py-12 relative">
        <div className="fixed top-4 right-4 md:top-6 md:right-6 flex items-center gap-2 z-20">
          <Link href="/admin">
            <Button className="btn-gradient glow">Admin</Button>
          </Link>
          <ThemeToggle />
        </div>
        <header ref={headerRef} className="my-10 md:my-15 flex items-start justify-between gap-4">
          <div>
            <div className="headline flex items-center gap-3 md:gap-4">
              <div className="relative rounded-full overflow-hidden ring-1 ring-[color:var(--color-border)] bg-white p-1 w-16 h-16 sm:w-20 sm:h-20 aspect-square shrink-0">
                <Image src="/logo.png" alt="Event logo" fill sizes="80px" className="object-cover" />
              </div>
              <div>
                <h1 className="text-pretty text-4xl md:text-6xl font-extrabold tracking-tight text-[color:var(--color-foreground)] mt-2 mb-2">
                  <span className="block">Google Cloud Study Jams</span>
                </h1>
                <span className="subline block text-base md:text-xl mt-1 text-[color:var(--color-muted-foreground)]">
                  GDG on Campus MMMUT
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

      {/* Fixed bottom-left logo with hover expansion */}
      <div className="fixed bottom-4 left-4 z-10 group">
        <div className="relative w-12 h-12 rounded-full overflow-hidden ring-1 ring-[color:var(--color-border)] transition-all duration-300 group-hover:w-48 group-hover:h-12 group-hover:rounded-lg group-hover:bg-gray-800">
          <video 
            src="/logo.mp4" 
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover rounded-full transition-all duration-300 group-hover:opacity-0" 
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-xs font-medium text-white whitespace-nowrap">
              Created by Shaurya Srivastava
            </span>
          </div>
        </div>
      </div>
    </main>
  )
}
