import { createHmac, timingSafeEqual, createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto"

export const SESSION_COOKIE_NAME = "session"
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url")
}

export function createSessionToken(secret: string): string {
  const payload = `ok.${Date.now() + SESSION_MAX_AGE_SECONDS * 1000}`
  return `${payload}.${sign(payload, secret)}`
}

export const API_KEY_COOKIE_NAME = "anthropic_key"

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest()
}

export function encryptApiKey(apiKey: string, secret: string): string {
  const key = deriveKey(secret)
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString("base64url")
}

export function decryptApiKey(encoded: string, secret: string): string | null {
  try {
    const key = deriveKey(secret)
    const buf = Buffer.from(encoded, "base64url")
    if (buf.length < 29) return null
    const iv = buf.subarray(0, 12)
    const tag = buf.subarray(12, 28)
    const encrypted = buf.subarray(28)
    const decipher = createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAuthTag(tag)
    return decipher.update(encrypted).toString("utf8") + decipher.final("utf8")
  } catch {
    return null
  }
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
