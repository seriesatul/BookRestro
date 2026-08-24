import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@bookrestro/shared-types';

export function requireRole(roles: UserRole[] | UserRole, ...rest: UserRole[]) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles, ...rest];

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient role' } });
      return;
    }

    next();
  };
}
