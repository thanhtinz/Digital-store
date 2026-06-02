import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, AdminPayload } from '../types/index';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export function requireUser(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ detail: 'Not authenticated' });
    return;
  }
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ detail: 'Invalid or expired token' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ detail: 'Not authenticated' });
    return;
  }
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as AdminPayload;
    if (!payload.role || !['admin', 'superadmin', 'staff'].includes(payload.role)) {
      res.status(403).json({ detail: 'Admin access required' });
      return;
    }
    (req as any).admin = payload;
    next();
  } catch {
    res.status(401).json({ detail: 'Invalid or expired token' });
  }
}

export function requireStaffOrAdmin(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ detail: 'Not authenticated' });
    return;
  }
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as AdminPayload;
    if (!payload.role || !['admin', 'superadmin', 'staff'].includes(payload.role)) {
      res.status(403).json({ detail: 'Staff or admin access required' });
      return;
    }
    (req as any).admin = payload;
    next();
  } catch {
    res.status(401).json({ detail: 'Invalid or expired token' });
  }
}

export function signToken(payload: Record<string, any>, expiresIn: string = '7d'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as any);
}

export function optionalUser(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const token = header.slice(7);
      const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
      (req as any).user = payload;
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next();
}
