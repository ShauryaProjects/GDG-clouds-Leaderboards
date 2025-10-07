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

      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-sm md:text-base text-center">
          <thead>
            <tr className="border-b border-[color:var(--color-border)] text-[color:var(--color-muted-foreground)]">
              <th className="py-3 px-3 font-medium text-center">Rank</th>
              <th className="py-3 px-3 font-medium text-center">User</th>
              <th className="py-3 px-3 font-medium text-center">Skill Badges</th>
              <th className="py-3 px-3 font-medium text-center">Arcade Games</th>
              <th className="py-3 px-3 font-medium text-center">Profile</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, idx) => {
              const rank = idx + 1
              const top3 = rank <= 3
              const isTarget = p.SkillBadges === 19 && p.ArcadeGames === 1
              // Explicit gold/silver/bronze colors for top 3
              const highlightColor = top3
                ? rank === 1
                  ? '#FFD700' // gold
                  : rank === 2
                    ? '#C0C0C0' // silver
                    : '#CD7F32' // bronze
                : undefined
              const rowStyle = top3
                ? {
                    backgroundColor: 'color-mix(in oklch, ' + (highlightColor || 'transparent') + ' 12%, transparent)',
                    boxShadow: 'inset 3px 0 0 0 ' + (highlightColor || 'transparent'),
                  } as React.CSSProperties
                : undefined
              return (
                <tr
                  key={`${p.Email || p.Name || "row"}-${idx}`}
                  className={`lb-row border-b border-[color:var(--color-border)] transition-colors ${isTarget ? "success-row" : ""}`}
                  style={rowStyle}
                >
                  <td className="py-3 pr-3 align-middle">
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-semibold" style={top3 ? { color: highlightColor } : undefined}>{rank}</span>
                      {top3 && (
                        <span title="Top performer" className="inline-flex items-center">
                          <Medal
                            className="size-4"
                            style={{
                              color: rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32',
                            }}
                          />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-3 align-middle">
                    <div className="flex flex-col items-center text-center">
                      <span className={top3 ? "font-semibold" : "font-medium"}>{p.Name}</span>
                      <span className="text-[color:var(--color-muted-foreground)] text-xs md:text-sm">{p.Email}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-3 align-middle">{p.SkillBadges}</td>
                  <td className="py-3 pr-3 align-middle">{p.ArcadeGames}</td>
                  <td className="py-3 pr-3 align-middle">
                    {(() => {
                      const trimmed = (p.ProfileURL || "").trim()
                      const hasUrl = trimmed.length > 0
                      const href = hasUrl ? (/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`) : ""
                      return hasUrl ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1 text-[color:var(--color-primary)] underline-offset-4 hover:underline cursor-pointer"
                        >
                          <ExternalLink className="size-4" />
                          <span className="hidden sm:inline">View Profile</span>
                        </a>
                      ) : (
                        <span className="inline-flex items-center justify-center gap-1 text-[color:var(--color-muted-foreground)] cursor-not-allowed">
                          <ExternalLink className="size-4" />
                          <span className="hidden sm:inline">View Profile</span>
                        </span>
                      )
                    })()}
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
