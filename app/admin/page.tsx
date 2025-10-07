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
const ADMIN_KEY = "gcsl-admin"
const ACCESS_CODE = "12Vikhyat@"

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [code, setCode] = useState("")
  const [uploading, setUploading] = useState(false)
  const headRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const was = getJSON<boolean>(ADMIN_KEY, false)
    setLoggedIn(!!was)
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
      setJSON(ADMIN_KEY, true)
    } else {
      alert("Invalid access code")
    }
  }

  function handleLogout() {
    setLoggedIn(false)
    setJSON(ADMIN_KEY, false as unknown as boolean)
  }

  function onUploadCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        try {
          const rows = (result.data as any[]).map((r) => ({
            Name: String(r.Name || "").trim(),
            Email: String(r.Email || "")
              .trim()
              .toLowerCase(),
            SkillBadges: Number(r.SkillBadges ?? 0),
            ArcadeGames: Number(r.ArcadeGames ?? 0),
            ProfileURL: String(r.ProfileURL || "").trim(),
          })) as Participant[]
          setJSON<Participant[]>(DATA_KEY, rows)
          alert("Leaderboard updated!")
        } catch (err) {
          console.error("[v0] CSV parse error:", err)
          alert("Failed to process CSV.")
        } finally {
          setUploading(false)
          e.currentTarget.value = ""
        }
      },
      error: (err) => {
        console.error("[v0] CSV error:", err)
        alert("Failed to parse CSV.")
        setUploading(false)
        e.currentTarget.value = ""
      },
    })
  }

  return (
    <main className="relative">
      <GradientBackground />
      <div className="container mx-auto max-w-3xl px-4 py-8 md:py-12">
        <header ref={headRef} className="mb-6 md:mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="headline text-pretty text-2xl md:text-4xl font-semibold tracking-tight">Admin</h1>
            <p className="subline text-[color:var(--color-muted-foreground)] mt-1">
              Manage participants via CSV upload. Session persists until logout.
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
                Columns: Name, Email, SkillBadges, ArcadeGames, ProfileURL
              </p>
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
