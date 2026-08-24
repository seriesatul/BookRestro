import type { AuthUser } from '@bookrestro/shared-types';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
