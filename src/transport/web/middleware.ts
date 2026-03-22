import type { Request, Response, NextFunction } from 'express'

const PASSWORD = process.env.WEB_AUTH_PASSWORD

export function authGuard(req: Request, res: Response, next: NextFunction): void {
  if (!PASSWORD) {
    // No password configured — open access (dev without auth)
    next()
    return
  }

  // Check Authorization: Bearer <password> header
  const authHeader = req.headers['authorization']
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    if (token === PASSWORD) {
      next()
      return
    }
  }

  // Check closet-auth cookie (for <img src> requests that can't set headers)
  const cookie = req.cookies?.['closet-auth']
  if (cookie === PASSWORD) {
    next()
    return
  }

  res.status(401).json({ error: 'Unauthorized' })
}
