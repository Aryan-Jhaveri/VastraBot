import type { Request, Response, NextFunction } from 'express'
import { timingSafeEqual } from 'crypto'
import { getSetting } from '../../db/queries.js'

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

  // Check Authorization: Bearer <token> header
  const authHeader = req.headers['authorization']
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    if (safeEqual(token, password)) {
      next()
      return
    }
  }

  // Check closet-auth cookie (for <img src> requests that can't set headers)
  const cookie = req.cookies?.['closet-auth']
  if (cookie && safeEqual(cookie, password)) {
    next()
    return
  }

  res.status(401).json({ error: 'Unauthorized' })
}
