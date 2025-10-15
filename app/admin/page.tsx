"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Papa from "papaparse"
import gsap from "gsap"
import { GradientBackground } from "@/components/gradient-background"
import { ThemeToggle } from "@/components/theme-toggle"
import { setJSON, getJSON } from "@/lib/storage"
import type { Participant } from "@/components/leaderboard-table"
import useSWR from "swr"

const DATA_KEY = "gcsl-data"
const FIXED_RANKINGS_KEY = "gcsl-fixed-rankings"
const ACCESS_CODE = "12Vikhyat@"

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

// Convert DD/MM/YYYY to ISO YYYY-MM-DD (UTC)
function toIsoDateFromDdmmyyyy(input: string): string | undefined {
  const trimmed = input.trim()
  // Support DD/MM/YYYY and DD-MM-YYYY
  let match = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (match) {
    const day = Number(match[1])
    const month = Number(match[2])
    const year = Number(match[3])
    if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return undefined
    if (month < 1 || month > 12 || day < 1 || day > 31) return undefined
    const dt = new Date(Date.UTC(year, month - 1, day))
    if (isNaN(dt.getTime())) return undefined
    return dt.toISOString().slice(0, 10)
  }
  // Support Excel serial dates (days since 1899-12-30)
  if (/^\d{1,6}$/.test(trimmed)) {
    const serial = Number(trimmed)
    if (Number.isFinite(serial) && serial > 0 && serial < 600000) {
      const excelEpoch = Date.UTC(1899, 11, 30)
      const millis = excelEpoch + serial * 24 * 60 * 60 * 1000
      const dt = new Date(millis)
      if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10)
    }
  }
  return undefined
}

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [code, setCode] = useState("")
  const [uploading, setUploading] = useState(false)
  const [pendingRows, setPendingRows] = useState<Participant[] | null>(null)
  const [selectedFileName, setSelectedFileName] = useState("")
  const [showFixedRankings, setShowFixedRankings] = useState(false)
  const [fixedRankEmail, setFixedRankEmail] = useState("")
  const [fixedRankValue, setFixedRankValue] = useState("")
  const [editRanks, setEditRanks] = useState<Record<string, string>>({})
  const headRef = useRef<HTMLDivElement>(null)
  
  // Fetch fixed rankings data
  const { data: fixedRankings, mutate: mutateFixedRankings } = useSWR<Record<string, number>>(
    FIXED_RANKINGS_KEY, 
    fixedRankingsFetcher, 
    { revalidateOnFocus: false }
  )

  // Always require passcode on each visit; do not persist login
  useEffect(() => {
    setLoggedIn(false)
  }, [])

  useEffect(() => {
    if (!headRef.current) return
    const ctx = gsap.context(() => {
      gsap.from(".headline", { y: 14, opacity: 0, duration: 0.6, ease: "power3.out" })
      gsap.from(".subline", { y: 10, opacity: 0, duration: 0.5, ease: "power2.out", delay: 0.08 })
      gsap.from(".actions", { y: 8, opacity: 0, duration: 0.5, ease: "power2.out", delay: 0.12 })
    }, headRef)
    return () => ctx.revert()
  }, [])

  // Keep editable inputs in sync when rankings load/update
  useEffect(() => {
    if (!fixedRankings) {
      setEditRanks({})
      return
    }
    const next: Record<string, string> = {}
    for (const [email, rank] of Object.entries(fixedRankings)) {
      next[email] = String(rank)
    }
    setEditRanks(next)
  }, [fixedRankings])

  function handleLogin() {
    if (code.trim() === ACCESS_CODE) {
      setLoggedIn(true)
    } else {
      alert("Invalid access code")
    }
  }

  function handleLogout() {
    setLoggedIn(false)
  }

  function onUploadCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const inputEl = e.currentTarget
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setSelectedFileName(file.name || "")
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (result: any) => {
        try {
          const raw = result.data as any[][]
          // Use rows starting from row index 1 (row 2 for humans)
          const rows: Participant[] = raw.slice(1).map((r, idx) => {
            const colA = r?.[0] ?? "" // A column (Name)
            const colB = r?.[1] ?? "" // B column (Email)
            const colC = r?.[2] ?? "" // C column (Profile URL or text with link)
            const colG = r?.[6] ?? 0   // G column (number)
            const colI = r?.[8] ?? 0   // I column (number)
            const colM = r?.[12] ?? "" // M column (date string)
            const name = String(colA).trim()
            const email = String(colB || "")
              .trim()
              .toLowerCase()
            let profileURL = String(colC || "").trim()
            // Attempt to extract URL if the cell contains display text or a formula
            if (profileURL) {
              // Matches https URLs or www. links inside any text (e.g., HYPERLINK formulas)
              const urlMatch = profileURL.match(/https?:\/\/[\w\-._~:\/?#\[\]@!$&'()*+,;=%]+|(?:www\.)[\w\-._~:\/?#\[\]@!$&'()*+,;=%]+/i)
              if (urlMatch) {
                profileURL = urlMatch[0]
              }
              if (profileURL && !/^https?:\/\//i.test(profileURL)) {
                profileURL = `https://${profileURL}`
              }
            }
            const skillBadges = Number(colG ?? 0)
            const arcadeGames = Number(colI ?? 0)

            // Extract completion date from column M only for those who completed 19 labs and 1 arcade game
            let completionDate: string | undefined
            if (Number.isFinite(skillBadges) && Number.isFinite(arcadeGames) && skillBadges === 19 && arcadeGames === 1) {
              const rawDate = String(colM || "").trim()
              if (rawDate) {
                // Parse DD/MM/YYYY explicitly and standardize to ISO (YYYY-MM-DD)
                completionDate = toIsoDateFromDdmmyyyy(rawDate)
              }
            }

            return {
              Name: name,
              Email: email,
              SkillBadges: Number.isFinite(skillBadges) ? skillBadges : 0,
              ArcadeGames: Number.isFinite(arcadeGames) ? arcadeGames : 0,
              ProfileURL: profileURL,
              CompletionDate: completionDate,
            }
          })
          setPendingRows(rows)
        } catch (err) {
          console.error("[v0] CSV parse error:", err)
          alert("Failed to process CSV.")
        } finally {
          setUploading(false)
          if (inputEl) inputEl.value = ""
        }
      },
      error: (err: any) => {
        console.error("[v0] CSV error:", err)
        alert("Failed to parse CSV.")
        setUploading(false)
        if (inputEl) inputEl.value = ""
      },
    })
  }

  async function handleCommitUpdate() {
    if (!pendingRows || pendingRows.length === 0) return
    try {
      // Persist to API so it's shared across visitors
      const res = await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingRows),
      })
      if (!res.ok) throw new Error("Save failed")
      setJSON<Participant[]>(DATA_KEY, pendingRows)
      alert("Leaderboard updated!")
    } catch (err) {
      console.error("[v0] Commit error:", err)
      alert("Failed to update leaderboard.")
    } finally {
      setPendingRows(null)
      setSelectedFileName("")
    }
  }

  async function handleAddFixedRank() {
    if (!fixedRankEmail.trim() || !fixedRankValue.trim()) {
      alert("Please enter both email and rank value")
      return
    }
    
    const rankValue = parseInt(fixedRankValue)
    if (isNaN(rankValue) || rankValue < 1) {
      alert("Please enter a valid rank number (1 or higher)")
      return
    }

    try {
      const currentRankings = fixedRankings || {}
      const updatedRankings = {
        ...currentRankings,
        [fixedRankEmail.trim().toLowerCase()]: rankValue
      }

      const res = await fetch("/api/fixed-rankings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedRankings),
      })
      
      if (!res.ok) throw new Error("Save failed")
      
      setJSON<Record<string, number>>(FIXED_RANKINGS_KEY, updatedRankings)
      mutateFixedRankings()
      setFixedRankEmail("")
      setFixedRankValue("")
      alert("Fixed ranking added!")
    } catch (err) {
      console.error("Fixed ranking error:", err)
      alert("Failed to add fixed ranking.")
    }
  }

  async function handleRemoveFixedRank(email: string) {
    try {
      const res = await fetch(`/api/fixed-rankings?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
      })
      
      if (!res.ok) throw new Error("Delete failed")
      
      const currentRankings = fixedRankings || {}
      const updatedRankings = { ...currentRankings }
      delete updatedRankings[email]
      
      setJSON<Record<string, number>>(FIXED_RANKINGS_KEY, updatedRankings)
      mutateFixedRankings()
      alert("Fixed ranking removed!")
    } catch (err) {
      console.error("Remove fixed ranking error:", err)
      alert("Failed to remove fixed ranking.")
    }
  }

  async function handleUpdateFixedRank(email: string) {
    const raw = editRanks[email]
    const parsed = parseInt((raw ?? "").trim())
    if (!Number.isFinite(parsed) || parsed < 1) {
      alert("Please enter a valid rank number (1 or higher)")
      return
    }
    try {
      const currentRankings = fixedRankings || {}
      const updatedRankings: Record<string, number> = {
        ...currentRankings,
        [email]: parsed,
      }
      const res = await fetch("/api/fixed-rankings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedRankings),
      })
      if (!res.ok) throw new Error("Save failed")
      setJSON<Record<string, number>>(FIXED_RANKINGS_KEY, updatedRankings)
      mutateFixedRankings()
      alert("Fixed ranking updated!")
    } catch (err) {
      console.error("Update fixed ranking error:", err)
      alert("Failed to update fixed ranking.")
    }
  }

  return (
    <main className="relative">
      <GradientBackground />
      <div className="container mx-auto max-w-3xl px-4 py-8 md:py-12">
        <header ref={headRef} className="mb-6 md:mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="headline text-pretty text-3xl md:text-5xl font-extrabold tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[color:var(--color-chart-2)] via-[color:var(--color-chart-4)] to-[color:var(--color-chart-5)]">Admin</span>
            </h1>
            <p className="subline text-[color:var(--color-muted-foreground)] mt-2">
              Manage participants via CSV upload. Passcode is required on each visit.
            </p>
          </div>
          <div className="actions flex items-center gap-2">
            <Link href="/leaderboard">
              <Button className="btn-gradient glow">Leaderboard</Button>
            </Link>
            <ThemeToggle />
          </div>
        </header>

        {!loggedIn ? (
          <div className="glass-card glow rounded-xl p-5 md:p-6">
            <label className="block text-sm mb-2">Enter Access Code</label>
            <div className="flex items-center gap-2">
              <Input
                type="password"
                className="input-glass"
                placeholder="Access code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLogin()
                }}
              />
              <Button onClick={handleLogin} className="btn-gradient glow">
                Login
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* CSV Upload Section */}
            <div className="glass-card glow rounded-xl p-8 md:p-12 text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
                Welcome Vikhyat,
              </h1>
              <div className="space-y-6">
                <div className="flex flex-col items-center justify-center min-h-[200px]">
                  <label className="text-xl mb-8 text-white underline">Upload CSV</label>
                   <div className="flex justify-center items-center mb-4">
                     <input
                       type="file"
                       accept=".csv"
                       onChange={onUploadCSV}
                       disabled={uploading}
                       className="hidden"
                       id="file-upload"
                       ref={(input) => {
                         if (input) {
                           input.style.display = 'none'
                         }
                       }}
                     />
                     <button
                       type="button"
                       onClick={() => {
                         const fileInput = document.getElementById('file-upload') as HTMLInputElement
                         if (fileInput) fileInput.click()
                       }}
                       disabled={uploading}
                       className="inline-flex items-center px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg cursor-pointer hover:from-blue-600 hover:to-purple-700 transition-all select-none disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       {selectedFileName ? selectedFileName : "Choose File"}
                     </button>
                   </div>
                   {pendingRows && (
                     <div className="flex flex-col items-center gap-3">
                       <Button onClick={handleCommitUpdate} className="btn-gradient glow" disabled={uploading}>
                         Update Leaderboard
                       </Button>
                     </div>
                   )}
                  <p className="text-white/70 text-sm mt-4 text-center">
                    Columns: Name (A), Email (B), Profile URL (C), SkillBadges (G), ArcadeGames (I)
                  </p>
                </div>
              </div>
            </div>

            {/* Fixed Rankings Management Section */}
            <div className="glass-card glow rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Fixed Rankings Management</h2>
                <Button
                  onClick={() => setShowFixedRankings(!showFixedRankings)}
                  className="btn-gradient glow"
                >
                  {showFixedRankings ? "Hide" : "Manage Fixed Rankings"}
                </Button>
              </div>
              
              {showFixedRankings && (
                <div className="space-y-4">
                  <div className="text-white/80 text-sm mb-4">
                    Fix rankings for students who completed 19 badges and 1 game. Their positions will remain stable even when the leaderboard is updated.
                  </div>
                  
                  {/* Add Fixed Ranking Form */}
                  <div className="flex gap-2 mb-6">
                    <Input
                      placeholder="Student email"
                      value={fixedRankEmail}
                      onChange={(e) => setFixedRankEmail(e.target.value)}
                      className="input-glass flex-1"
                    />
                    <Input
                      placeholder="Rank number"
                      type="number"
                      value={fixedRankValue}
                      onChange={(e) => setFixedRankValue(e.target.value)}
                      className="input-glass w-24"
                    />
                    <Button onClick={handleAddFixedRank} className="btn-gradient glow">
                      Add
                    </Button>
                  </div>

                  {/* Current Fixed Rankings List */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">Current Fixed Rankings:</h3>
                    {fixedRankings && Object.keys(fixedRankings).length > 0 ? (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {Object.entries(fixedRankings)
                          .sort(([,a], [,b]) => a - b)
                          .map(([email, rank]) => (
                            <div key={email} className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                              <div className="flex items-center gap-3">
                                <span className="text-white/80">{email}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-white/60 text-sm">Rank</span>
                                  <Input
                                    type="number"
                                    className="input-glass w-24"
                                    value={editRanks[email] ?? String(rank)}
                                    onChange={(e) => setEditRanks((prev) => ({ ...prev, [email]: e.target.value }))}
                                  />
                                  <Button
                                    size="sm"
                                    className="btn-gradient glow"
                                    onClick={() => handleUpdateFixedRank(email)}
                                  >
                                    Save
                                  </Button>
                                </div>
                              </div>
                              <Button
                                onClick={() => handleRemoveFixedRank(email)}
                                variant="outline"
                                size="sm"
                                className="border-red-400 text-red-400 hover:bg-red-400/10"
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-white/60 text-sm">No fixed rankings set</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-center gap-2">
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
              >
                Logout
              </Button>
              <Link href="/leaderboard">
                <Button className="btn-gradient glow">Go to Leaderboard</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
