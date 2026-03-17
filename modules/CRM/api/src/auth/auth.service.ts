import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(email: string, password: string) {
    if (!email || !password) {
      throw new BadRequestException("email and password are required");
    }
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const token = this.signToken(user);
    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        brandId: user.brandId,
        teamId: user.teamId,
        title: user.title,
        managerId: user.managerId,
        positionId: user.positionId,
      },
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!currentPassword || !newPassword) {
      throw new BadRequestException("currentPassword and newPassword are required");
    }
    if (newPassword.length < 8) {
      throw new BadRequestException("newPassword must be at least 8 characters");
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new NotFoundException("User not found");
    }
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const nextHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: nextHash } });
    return { changed: true };
  }

  async resetPassword(adminUserId: string, targetUserId: string, newPassword: string) {
    if (!targetUserId || !newPassword) {
      throw new BadRequestException("userId and newPassword are required");
    }
    if (newPassword.length < 8) {
      throw new BadRequestException("newPassword must be at least 8 characters");
    }
    const admin = await this.prisma.user.findUnique({ where: { id: adminUserId } });
    if (!admin || admin.role !== "manager") {
      throw new UnauthorizedException("Not allowed");
    }
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) {
      throw new NotFoundException("User not found");
    }
    const nextHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: targetUserId }, data: { passwordHash: nextHash } });
    return { reset: true };
  }

  private signToken(user: { id: string; email: string; role: string; brandId: string; teamId?: string | null }) {
    const secret = process.env.JWT_SECRET || "dev_secret";
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        brandId: user.brandId,
        teamId: user.teamId ?? null,
      },
      secret,
      { expiresIn: "7d" }
    );
  }
}
