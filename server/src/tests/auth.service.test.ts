import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { describe, expect, it } from 'vitest';
import type { UserRole } from '@bookrestro/shared-types';
import { AppError } from '../lib/errors.js';
import {
  AuthService,
  type AuthUserRecord,
  type AuthUserRepository,
  hashRefreshToken,
} from '../services/auth.service.js';

class InMemoryAuthUserRepository implements AuthUserRepository {
  private readonly users = new Map<string, AuthUserRecord>();

  constructor(user: AuthUserRecord) {
    this.users.set(user.id, user);
  }

  async findByEmail(email: string) {
    return [...this.users.values()].find((user) => user.email === email) ?? null;
  }

  async findById(id: string) {
    return this.users.get(id) ?? null;
  }

  async create(data: {
    name: string;
    email: string;
    password_hash: string;
    phone: string;
    role: UserRole;
    dietary_pref: string[];
  }) {
    const user: AuthUserRecord = {
      ...data,
      id: randomUUID(),
      refresh_token_hash: null,
      created_at: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateRefreshTokenHash(userId: string, refreshTokenHash: string | null) {
    const user = this.users.get(userId);
    if (!user) {
      return;
    }
    this.users.set(userId, { ...user, refresh_token_hash: refreshTokenHash });
  }
}

const secrets = {
  access: 'test-access-secret-with-at-least-thirty-two-chars',
  refresh: 'test-refresh-secret-with-at-least-thirty-two-chars',
};

async function createHarness() {
  const password_hash = await bcrypt.hash('correct-password', 4);
  const user: AuthUserRecord = {
    id: randomUUID(),
    name: 'Test Customer',
    email: 'customer@bookrestro.test',
    password_hash,
    phone: '+919000000001',
    role: 'customer',
    dietary_pref: [],
    refresh_token_hash: null,
    created_at: new Date(),
  };
  const repo = new InMemoryAuthUserRepository(user);
  const service = new AuthService(repo, secrets);
  return { repo, service, user };
}

describe('AuthService refresh token rotation', () => {
  it('issues a new refresh token and invalidates the old token hash on the happy path', async () => {
    const { repo, service, user } = await createHarness();
    const loginSession = await service.login({
      email: 'customer@bookrestro.test',
      password: 'correct-password',
    });

    const rotatedSession = await service.refresh(loginSession.refreshToken);
    const persistedUser = await repo.findById(user.id);

    expect(rotatedSession.accessToken).toBeTruthy();
    expect(rotatedSession.refreshToken).not.toBe(loginSession.refreshToken);
    expect(persistedUser?.refresh_token_hash).toBe(hashRefreshToken(rotatedSession.refreshToken));
    expect(persistedUser?.refresh_token_hash).not.toBe(hashRefreshToken(loginSession.refreshToken));
  });

  it('treats reuse of an old rotated refresh token as theft and invalidates the session', async () => {
    const { repo, service, user } = await createHarness();
    const loginSession = await service.login({
      email: 'customer@bookrestro.test',
      password: 'correct-password',
    });

    await service.refresh(loginSession.refreshToken);

    await expect(service.refresh(loginSession.refreshToken)).rejects.toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
    } satisfies Partial<AppError>);

    const persistedUser = await repo.findById(user.id);
    expect(persistedUser?.refresh_token_hash).toBeNull();
  });
});
