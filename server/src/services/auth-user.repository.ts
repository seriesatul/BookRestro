import type { UserRole } from '@bookrestro/shared-types';
import { prisma } from '../lib/prisma.js';
import type { AuthUserRepository } from './auth.service.js';

export class PrismaAuthUserRepository implements AuthUserRepository {
  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  async create(data: {
    name: string;
    email: string;
    password_hash: string;
    phone: string;
    role: UserRole;
    dietary_pref: string[];
  }) {
    return prisma.user.create({ data });
  }

  async updateRefreshTokenHash(userId: string, refreshTokenHash: string | null) {
    await prisma.user.update({
      where: { id: userId },
      data: { refresh_token_hash: refreshTokenHash },
    });
  }
}
