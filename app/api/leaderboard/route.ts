import { NextResponse } from "next/server"
import { Redis } from "@upstash/redis"

// Keep an in-memory fallback for local/dev and when Redis is not configured
let inMemoryData: any[] = []

// Use the provided Upstash Redis snippet
const redis = new Redis({
    url: 'https://sharp-condor-9261.upstash.io',
    token: 'ASQtAAImcDJhZGRkYTYwMjJlMWY0MmI5OGI2N2RiY2VmY2U3MTc1MnAyOTI2MQ',
})

async function saveToRedis(key: string, value: any[] | null) {
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

async function loadFromRedis(key: string): Promise<any[] | null> {
    try {
        const raw = await redis.get<string>(key)
        if (!raw) return []
        return typeof raw === "string" ? JSON.parse(raw) : (raw as any[])
    } catch {
        return null
    }
}

const DATA_KEY = "gcsl-data"

export async function GET() {
    // Prefer Redis if available; fall back to in-memory cache
    const redisData = await loadFromRedis(DATA_KEY)
    const data = redisData ?? inMemoryData
    return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        if (!Array.isArray(body)) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
        }
        inMemoryData = body
        await saveToRedis(DATA_KEY, body)
        return NextResponse.json({ ok: true })
    } catch (err) {
        return NextResponse.json({ error: "Failed to save" }, { status: 500 })
    }
}


