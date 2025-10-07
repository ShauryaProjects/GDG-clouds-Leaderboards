"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { ExternalLink, Medal } from "lucide-react"
import gsap from "gsap"

export type Participant = {
  Name: string
  Email: string
  SkillBadges: number
  ArcadeGames: number
  ProfileURL: string
}

export function LeaderboardTable({ data }: { data: Participant[] }) {
  const [query, setQuery] = useState("")
  const tableRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!tableRef.current) return
    const ctx = gsap.context(() => {
      gsap.from(".lb-row", { opacity: 0, y: 12, stagger: 0.04, duration: 0.5, ease: "power2.out", delay: 0.15 })
    }, tableRef)
    return () => ctx.revert()
  }, [data])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return data
    return data.filter((p) => p.Name.toLowerCase().includes(q) || p.Email.toLowerCase().includes(q))
  }, [data, query])

  return (
    <div className="glass-card glow rounded-xl p-4 md:p-6" ref={tableRef}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex-1">
          <Input
            className="input-glass w-full"
            placeholder="Search by name or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm md:text-base">
          <thead className="text-left">
            <tr className="border-b border-[color:var(--color-border)] text-[color:var(--color-muted-foreground)]">
              <th className="py-3 pr-3 font-medium">Rank</th>
              <th className="py-3 pr-3 font-medium">User</th>
              <th className="py-3 pr-3 font-medium">Skill Badges</th>
              <th className="py-3 pr-3 font-medium">Arcade Games</th>
              <th className="py-3 pr-3 font-medium">Profile</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, idx) => {
              const rank = idx + 1
              const top3 = rank <= 3
              const isTarget = p.SkillBadges === 19 && p.ArcadeGames === 1
              return (
                <tr
                  key={p.Email}
                  className={`lb-row border-b border-[color:var(--color-border)] transition-colors ${isTarget ? "success-row" : ""}`}
                >
                  <td className="py-3 pr-3 align-middle">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{rank}</span>
                      {top3 && (
                        <span title="Top performer" className="inline-flex items-center">
                          <Medal
                            className="size-4"
                            style={{
                              color:
                                rank === 1
                                  ? "var(--color-chart-4)" // yellow-ish
                                  : rank === 2
                                    ? "var(--color-muted-foreground)"
                                    : "var(--color-chart-5)", // orange-ish
                            }}
                          />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-3 align-middle">
                    <div className="flex flex-col">
                      <span className="font-medium">{p.Name}</span>
                      <span className="text-[color:var(--color-muted-foreground)] text-xs md:text-sm">{p.Email}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-3 align-middle">{p.SkillBadges}</td>
                  <td className="py-3 pr-3 align-middle">{p.ArcadeGames}</td>
                  <td className="py-3 pr-3 align-middle">
                    <a
                      className="inline-flex items-center gap-1 text-[color:var(--color-primary)] underline-offset-4 hover:underline"
                      href={p.ProfileURL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="size-4" />
                      View Profile
                    </a>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-[color:var(--color-muted-foreground)]">
                  No participants found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
