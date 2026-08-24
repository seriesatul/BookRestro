import { Router } from 'express';
import { z } from 'zod';
import type { Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { PrismaAuthUserRepository } from '../services/auth-user.repository.js';

const refreshCookieName = 'refresh_token';

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(5),
  dietary_pref: z.array(z.string()).optional(),
  role: z.enum(['customer', 'owner']).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export function createAuthRouter(authService = new AuthService(new PrismaAuthUserRepository())) {
  const router = Router();

  router.post('/register', async (req, res, next) => {
    try {
      const session = await authService.register(registerSchema.parse(req.body));
      setRefreshCookie(res, session.refreshToken);
      res.status(201).json({ accessToken: session.accessToken, user: session.user });
    } catch (error) {
      next(error);
    }
  });

  router.post('/login', async (req, res, next) => {
    try {
      const session = await authService.login(loginSchema.parse(req.body));
      setRefreshCookie(res, session.refreshToken);
      res.json({ accessToken: session.accessToken, user: session.user });
    } catch (error) {
      next(error);
    }
  });

  router.post('/refresh', async (req, res, next) => {
    try {
      const session = await authService.refresh(req.cookies?.[refreshCookieName]);
      setRefreshCookie(res, session.refreshToken);
      res.json({ accessToken: session.accessToken, user: session.user });
    } catch (error) {
      clearRefreshCookie(res);
      next(error);
    }
  });

  router.post('/logout', async (req, res, next) => {
    try {
      await authService.logout(req.cookies?.[refreshCookieName]);
      clearRefreshCookie(res);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie(refreshCookieName, refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(refreshCookieName, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/api/auth',
  });
}
