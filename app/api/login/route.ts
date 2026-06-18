import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, encryptApiKey, API_KEY_COOKIE_NAME } from "@/lib/auth"

export async function POST(request: Request) {
  const { code, apiKey } = await request.json()
  const accessCode = process.env.ACCESS_CODE
  const secret = process.env.SESSION_SECRET

  if (!accessCode || !secret) {
    return NextResponse.json({ error: "Server is not configured" }, { status: 500 })
  }

  if (typeof code !== "string" || code !== accessCode) {
    return NextResponse.json({ error: "Incorrect access code" }, { status: 401 })
  }

  const token = createSessionToken(secret)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  })

  if (typeof apiKey === "string" && apiKey.trim()) {
    cookieStore.set(API_KEY_COOKIE_NAME, encryptApiKey(apiKey.trim(), secret), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    })
  }

  return NextResponse.json({ ok: true })
}
