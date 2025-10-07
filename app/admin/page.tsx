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

const DATA_KEY = "gcsl-data"
const ACCESS_CODE = "12Vikhyat@"

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [code, setCode] = useState("")
  const [uploading, setUploading] = useState(false)
  const [pendingRows, setPendingRows] = useState<Participant[] | null>(null)
  const [selectedFileName, setSelectedFileName] = useState("")
  const headRef = useRef<HTMLDivElement>(null)

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
      complete: (result) => {
        try {
          const raw = result.data as any[][]
          // Use rows starting from row index 1 (row 2 for humans)
          const rows: Participant[] = raw.slice(1).map((r, idx) => {
            const colA = r?.[0] ?? "" // A column (Name)
            const colB = r?.[1] ?? "" // B column (Email)
            const colC = r?.[2] ?? "" // C column (Profile URL or text with link)
            const colG = r?.[6] ?? 0   // G column (number)
            const colI = r?.[8] ?? 0   // I column (number)
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

            return {
              Name: name,
              Email: email,
              SkillBadges: Number.isFinite(skillBadges) ? skillBadges : 0,
              ArcadeGames: Number.isFinite(arcadeGames) ? arcadeGames : 0,
              ProfileURL: profileURL,
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
      error: (err) => {
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
      // Persist to API so it’s shared across visitors
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
          <div className="glass-card glow rounded-xl p-5 md:p-6 space-y-4">
            <div>
              <label className="block text-sm mb-2">Upload CSV</label>
              <input
                type="file"
                accept=".csv"
                onChange={onUploadCSV}
                disabled={uploading}
                className="block w-full text-sm file:mr-3 file:btn-gradient file:border file:rounded file:px-3 file:py-1.5 file:cursor-pointer file:glow"
              />
              <p className="text-[color:var(--color-muted-foreground)] text-sm mt-2">
                Columns: Name (A), Email (B), Profile URL (C), SkillBadges (G), ArcadeGames (I)
              </p>
              {pendingRows && (
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-sm">Selected: <strong>{selectedFileName || "(unnamed)"}</strong></span>
                  <Button onClick={handleCommitUpdate} className="btn-gradient glow" disabled={uploading}>
                    Update Leaderboard
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-[color:var(--color-border)] bg-transparent"
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
