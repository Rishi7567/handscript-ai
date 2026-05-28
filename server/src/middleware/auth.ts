import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  id: string;
  email: string;
  name: string;
}

// Merge our fields into the Express.User interface so req.user is typed correctly
// (passport's @types already defines req.user as Express.User | undefined)
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name: string;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7);
  // guest-token is a client-side sentinel — never treat as real auth
  if (token === 'guest-token' || !token) return null;
  return token;
}

/** Requires a valid JWT. Returns 401 if missing or invalid. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Attaches user to req if a valid JWT is present, but never blocks the request. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET as string) as Express.User;
    } catch {
      // ignore invalid tokens in optional mode
    }
  }
  next();
}
