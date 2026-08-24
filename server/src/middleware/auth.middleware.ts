import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { UserRole } from '@bookrestro/shared-types';
import { env } from '../config/env.js';

type AccessPayload = jwt.JwtPayload & {
  sub: string;
  role: UserRole;
};

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;

  if (!token) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing access token' } });
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid access token' } });
  }
}
