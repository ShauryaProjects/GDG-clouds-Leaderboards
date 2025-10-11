import { NextResponse } from "next/server"
import { Redis } from "@upstash/redis"

// Keep an in-memory fallback for local/dev and when Redis is not configured
let inMemoryFixedRankings: Record<string, number> = {}

// Use the provided Upstash Redis snippet
const redis = new Redis({
    url: 'https://sharp-condor-9261.upstash.io',
    token: 'ASQtAAImcDJhZGRkYTYwMjJlMWY0MmI5OGI2N2RiY2VmY2U3MTc1MnAyOTI2MQ',
})

async function saveToRedis(key: string, value: any) {
    try {
        if (value) {
            await redis.set(key, JSON.stringify(value))
        } else {
            await redis.del(key)
        }
        return true
    } catch {
        return false
    }
}

async function loadFromRedis(key: string): Promise<any | null> {
    try {
        const raw = await redis.get<string>(key)
        if (!raw) return null
        return typeof raw === "string" ? JSON.parse(raw) : raw
    } catch {
        return null
    }
}

const FIXED_RANKINGS_KEY = "gcsl-fixed-rankings"

export async function GET() {
    // Prefer Redis if available; fall back to in-memory cache
    const redisData = await loadFromRedis(FIXED_RANKINGS_KEY)
    const data = redisData ?? inMemoryFixedRankings
    return NextResponse.json(data ?? {})
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        if (typeof body !== "object" || body === null) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
        }
        
        // Validate that all values are numbers
        for (const [key, value] of Object.entries(body)) {
            if (typeof value !== "number" || value < 1) {
                return NextResponse.json({ error: "Invalid ranking value" }, { status: 400 })
            }
        }
        
        inMemoryFixedRankings = body as Record<string, number>
        await saveToRedis(FIXED_RANKINGS_KEY, body)
        return NextResponse.json({ ok: true })
    } catch (err) {
        return NextResponse.json({ error: "Failed to save fixed rankings" }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const email = searchParams.get('email')
        
        if (!email) {
            return NextResponse.json({ error: "Email parameter required" }, { status: 400 })
        }
        
        // Remove the fixed ranking for this email
        delete inMemoryFixedRankings[email]
        await saveToRedis(FIXED_RANKINGS_KEY, inMemoryFixedRankings)
        return NextResponse.json({ ok: true })
    } catch (err) {
        return NextResponse.json({ error: "Failed to remove fixed ranking" }, { status: 500 })
    }
}

