import { NextResponse } from "next/server"

// Keep an in-memory fallback for local/dev and when KV is not configured
let inMemoryData: any[] = []

async function saveToKV(key: string, value: any[] | null) {
	try {
		// Lazy import to avoid hard dependency when env isn't set
		const { kv } = await import("@vercel/kv").catch(() => ({ kv: null as any }))
		if (!kv) return false
		if (value) {
			await kv.set(key, JSON.stringify(value))
		} else {
			await kv.del(key)
		}
		return true
	} catch {
		return false
	}
}

async function loadFromKV(key: string): Promise<any[] | null> {
	try {
		const { kv } = await import("@vercel/kv").catch(() => ({ kv: null as any }))
		if (!kv) return null
		const raw = await kv.get<string>(key)
		if (!raw) return []
		return JSON.parse(raw)
	} catch {
		return null
	}
}

const DATA_KEY = "gcsl-data"

export async function GET() {
	// Prefer KV if available; fall back to in-memory cache
	const kvData = await loadFromKV(DATA_KEY)
	const data = kvData ?? inMemoryData
	return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
	try {
		const body = await req.json()
		if (!Array.isArray(body)) {
			return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
		}
		inMemoryData = body
		await saveToKV(DATA_KEY, body)
		return NextResponse.json({ ok: true })
	} catch (err) {
		return NextResponse.json({ error: "Failed to save" }, { status: 500 })
	}
}


