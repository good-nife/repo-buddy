import { createHmac, timingSafeEqual } from "node:crypto"

export const SESSION_COOKIE_NAME = "session"
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url")
}

export function createSessionToken(secret: string): string {
  const payload = `ok.${Date.now() + SESSION_MAX_AGE_SECONDS * 1000}`
  return `${payload}.${sign(payload, secret)}`
}

export function verifySessionToken(token: string | undefined | null, secret: string): boolean {
  if (!token) return false

  const parts = token.split(".")
  if (parts.length !== 3) return false
  const [marker, expiry, sig] = parts

  const expected = sign(`${marker}.${expiry}`, secret)
  if (expected.length !== sig.length) return false
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return false

  return marker === "ok" && Date.now() < Number(expiry)
}
