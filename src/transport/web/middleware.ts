import type { Request, Response, NextFunction } from 'express'
import { timingSafeEqual, createHmac } from 'crypto'
import { getSetting } from '../../db/queries.js'

// Derives a session token from the raw password — cookies and Bearer headers
// store this token, never the password itself.
export function sessionToken(password: string): string {
  return createHmac('sha256', 'closet-session-v1').update(password).digest('hex')
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

export function getPassword(): string | null {
  return getSetting('password') ?? process.env.WEB_AUTH_PASSWORD ?? null
}

export function authGuard(req: Request, res: Response, next: NextFunction): void {
  const password = getPassword()
  if (!password) {
    // No password configured — open access
    next()
    return
  }

  const expected = sessionToken(password)

  // Check Authorization: Bearer <token> header
  const authHeader = req.headers['authorization']
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    if (safeEqual(token, expected)) {
      next()
      return
    }
  }

  // Check closet-auth cookie (for <img src> requests that can't set headers)
  const cookie = req.cookies?.['closet-auth']
  if (cookie && safeEqual(cookie, expected)) {
    next()
    return
  }

  res.status(401).json({ error: 'Unauthorized' })
}
