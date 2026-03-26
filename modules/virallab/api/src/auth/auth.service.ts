import { Injectable, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { ViralLabStoreService } from "../store/store.service";
import { PrismaService } from "../prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly store: ViralLabStoreService,
    private readonly prisma: PrismaService,
  ) {}

  private mapUserRecord(item: {
    id: string;
    email: string;
    passwordHash: string;
    displayName: string;
    status: string;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: item.id,
      email: item.email,
      passwordHash: item.passwordHash,
      displayName: item.displayName,
      status: item.status as "active",
      lastLoginAt: item.lastLoginAt?.toISOString() || null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private async findPrismaUserByEmail(email: string) {
    const users = await this.prisma.user.findMany();
    return users.find((item) => item.email.toLowerCase() === email.toLowerCase()) || null;
  }

  private async syncUserToJson(user: {
    id: string;
    email: string;
    passwordHash: string;
    displayName: string;
    status: "active";
    lastLoginAt: string | null;
    createdAt: string;
    updatedAt: string;
  }) {
    await this.store.mutate((db) => {
      const existing = db.users.find((item) => item.id === user.id);
      if (existing) {
        Object.assign(existing, user);
      } else {
        db.users.push(user);
      }
      return null;
    });
  }

  private async syncSessionToJson(session: {
    id: string;
    userId: string;
    token: string;
    createdAt: string;
    expiredAt: string;
  }, options?: { lastLoginAt?: string | null }) {
    await this.store.mutate((db) => {
      const existing = db.sessions.find((item) => item.id === session.id || item.token === session.token);
      if (existing) {
        Object.assign(existing, session);
      } else {
        db.sessions.push(session);
      }

      if (options?.lastLoginAt) {
        const user = db.users.find((item) => item.id === session.userId);
        if (user) {
          user.lastLoginAt = options.lastLoginAt;
          user.updatedAt = options.lastLoginAt;
        }
      }
      return null;
    });
  }

  private async removeSessionFromJson(token: string) {
    await this.store.mutate((db) => {
      db.sessions = db.sessions.filter((item) => item.token !== token);
      return null;
    });
  }

  async resolveUserIdOrDefault(token?: string) {
    const user = await this.resolveUserFromToken(token);
    if (user?.id) return user.id;

    if (this.prisma.isEnabled()) {
      const fallbackUser = await this.prisma.user.findFirst({
        orderBy: { createdAt: "asc" },
      });
      if (fallbackUser?.id) return fallbackUser.id;
    }

    const db = await this.store.read();
    return db.users[0]?.id || "user_demo";
  }

  async register(email: string, password: string, displayName: string) {
    if (this.prisma.isEnabled()) {
      const existed = await this.findPrismaUserByEmail(email);
      if (existed) {
        return {
          success: false,
          message: "Email already exists.",
        };
      }

      const timestamp = new Date().toISOString();
      const user = {
        id: this.store.createId("user"),
        email,
        passwordHash: await bcrypt.hash(password, 8),
        displayName,
        status: "active" as const,
        lastLoginAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      await this.prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          passwordHash: user.passwordHash,
          displayName: user.displayName,
          status: user.status,
          lastLoginAt: null,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt),
        },
      });

      await this.syncUserToJson(user);

      return {
        success: true,
        user: { id: user.id, email: user.email, displayName: user.displayName },
      };
    }

    return this.store.mutate(async (db) => {
      const existed = db.users.find((item) => item.email.toLowerCase() === email.toLowerCase());
      if (existed) {
        return {
          success: false,
          message: "Email already exists.",
        };
      }
      const timestamp = new Date().toISOString();
      const user = {
        id: this.store.createId("user"),
        email,
        passwordHash: await bcrypt.hash(password, 8),
        displayName,
        status: "active" as const,
        lastLoginAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.users.push(user);
      return {
        success: true,
        user: { id: user.id, email: user.email, displayName: user.displayName },
      };
    });
  }

  async login(email: string, password: string) {
    if (this.prisma.isEnabled()) {
      const user = await this.findPrismaUserByEmail(email);
      if (!user) throw new UnauthorizedException("Invalid email or password");
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) throw new UnauthorizedException("Invalid email or password");

      const token = `vl_${randomUUID().replace(/-/g, "")}`;
      const timestamp = new Date().toISOString();
      const session = {
        id: this.store.createId("session"),
        userId: user.id,
        token,
        createdAt: timestamp,
        expiredAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      };

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(timestamp),
          updatedAt: new Date(timestamp),
        },
      });

      await this.prisma.userSession.create({
        data: {
          id: session.id,
          userId: session.userId,
          token: session.token,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.createdAt),
          expiredAt: new Date(session.expiredAt),
        },
      });

      await this.syncSessionToJson(session, { lastLoginAt: timestamp });

      return {
        success: true,
        token,
        user: { id: user.id, email: user.email, displayName: user.displayName },
      };
    }

    return this.store.mutate(async (db) => {
      const user = db.users.find((item) => item.email.toLowerCase() === email.toLowerCase());
      if (!user) throw new UnauthorizedException("Invalid email or password");
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) throw new UnauthorizedException("Invalid email or password");
      const token = `vl_${randomUUID().replace(/-/g, "")}`;
      const timestamp = new Date().toISOString();
      user.lastLoginAt = timestamp;
      user.updatedAt = timestamp;
      db.sessions.push({
        id: this.store.createId("session"),
        userId: user.id,
        token,
        createdAt: timestamp,
        expiredAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      });
      return {
        success: true,
        token,
        user: { id: user.id, email: user.email, displayName: user.displayName },
      };
    });
  }

  async me(token?: string) {
    const user = await this.resolveUserFromToken(token);
    if (!user) throw new UnauthorizedException("No active user");
    return {
      success: true,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    };
  }

  async logout(token?: string) {
    if (!token) {
      return { success: true };
    }
    if (this.prisma.isEnabled()) {
      await this.prisma.userSession.deleteMany({
        where: { token },
      });
      await this.removeSessionFromJson(token);
      return { success: true };
    }
    return this.store.mutate((db) => {
      db.sessions = db.sessions.filter((item) => item.token !== token);
      return { success: true };
    });
  }

  async resolveUserFromToken(token?: string) {
    if (this.prisma.isEnabled()) {
      if (!token) {
      const user = await this.prisma.user.findFirst({
          orderBy: { createdAt: "asc" },
        });
        return user ? this.mapUserRecord(user) : null;
      }

      const session = await this.prisma.userSession.findFirst({
        where: { token },
        include: { user: true },
      });
      if (!session?.user) return null;
      return this.mapUserRecord(session.user);
    }

    const db = await this.store.read();
    if (!token) {
      return db.users[0] || null;
    }
    const session = db.sessions.find((item) => item.token === token);
    if (!session) return null;
    return db.users.find((item) => item.id === session.userId) || null;
  }
}
