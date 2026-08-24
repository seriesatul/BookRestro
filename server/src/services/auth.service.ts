import { createHash, randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { UserRole } from '@bookrestro/shared-types';
import { AppError } from '../lib/errors.js';
import { env } from '../config/env.js';

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';
const PASSWORD_COST = 12;

export type AuthUserRecord = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  phone: string;
  role: UserRole;
  dietary_pref: string[];
  refresh_token_hash: string | null;
  created_at: Date;
};

export type AuthUserRepository = {
  findByEmail(email: string): Promise<AuthUserRecord | null>;
  findById(id: string): Promise<AuthUserRecord | null>;
  create(data: {
    name: string;
    email: string;
    password_hash: string;
    phone: string;
    role: UserRole;
    dietary_pref: string[];
  }): Promise<AuthUserRecord>;
  updateRefreshTokenHash(userId: string, refreshTokenHash: string | null): Promise<void>;
};

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  phone: string;
  dietary_pref?: string[];
  role?: Extract<UserRole, 'customer' | 'owner'>;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    dietary_pref: string[];
    created_at: Date;
  };
};

type RefreshPayload = jwt.JwtPayload & {
  sub: string;
  jti: string;
};

export class AuthService {
  constructor(
    private readonly users: AuthUserRepository,
    private readonly secrets = {
      access: env.JWT_ACCESS_SECRET,
      refresh: env.JWT_REFRESH_SECRET,
    },
  ) {}

  async register(input: RegisterInput): Promise<AuthSession> {
    const email = input.email.toLowerCase();
    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw new AppError(409, 'CONFLICT', 'Email is already registered');
    }

    const password_hash = await bcrypt.hash(input.password, PASSWORD_COST);
    const user = await this.users.create({
      name: input.name,
      email,
      password_hash,
      phone: input.phone,
      role: input.role ?? 'customer',
      dietary_pref: input.dietary_pref ?? [],
    });

    return this.issueSession(user);
  }

  async login(input: LoginInput): Promise<AuthSession> {
    const user = await this.users.findByEmail(input.email.toLowerCase());
    if (!user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(input.password, user.password_hash);
    if (!passwordMatches) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password');
    }

    return this.issueSession(user);
  }

  async refresh(refreshToken: string | undefined): Promise<AuthSession> {
    if (!refreshToken) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing refresh token');
    }

    let payload: RefreshPayload;
    try {
      payload = jwt.verify(refreshToken, this.secrets.refresh) as RefreshPayload;
    } catch {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid refresh token');
    }

    const user = await this.users.findById(payload.sub);
    if (!user || !user.refresh_token_hash) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid refresh token');
    }

    const presentedHash = hashRefreshToken(refreshToken);
    if (presentedHash !== user.refresh_token_hash) {
      // Refresh token theft detection: an already-rotated token was reused, so
      // invalidate the whole session instead of only rejecting this request.
      await this.users.updateRefreshTokenHash(user.id, null);
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid refresh token');
    }

    return this.issueSession(user);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    try {
      const payload = jwt.verify(refreshToken, this.secrets.refresh) as RefreshPayload;
      await this.users.updateRefreshTokenHash(payload.sub, null);
    } catch {
      // Logout is idempotent: an invalid or expired cookie is still cleared by the route.
      return;
    }
  }

  private async issueSession(user: AuthUserRecord): Promise<AuthSession> {
    const accessToken = jwt.sign({ role: user.role }, this.secrets.access, {
      subject: user.id,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });

    const refreshToken = jwt.sign({ jti: randomUUID() }, this.secrets.refresh, {
      subject: user.id,
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });

    await this.users.updateRefreshTokenHash(user.id, hashRefreshToken(refreshToken));

    return {
      accessToken,
      refreshToken,
      user: sanitizeUser(user),
    };
  }
}

export function hashRefreshToken(refreshToken: string) {
  return createHash('sha256').update(refreshToken).digest('hex');
}

function sanitizeUser(user: AuthUserRecord): AuthSession['user'] {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    dietary_pref: user.dietary_pref,
    created_at: user.created_at,
  };
}
