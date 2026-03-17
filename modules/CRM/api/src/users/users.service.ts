import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import * as bcrypt from "bcryptjs";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { brandId?: string; teamId?: string }) {
    if (!params.brandId) {
      return [];
    }
    return this.prisma.user.findMany({
      where: {
        brandId: params.brandId,
        ...(params.teamId ? { teamId: params.teamId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(params: { id: string; brandId?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: params.id } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    if (params.brandId && user.brandId !== params.brandId) {
      throw new NotFoundException("User not found");
    }
    return user;
  }

  async create(body: CreateUserDto) {
    if (!body.brandId || !body.email || !body.name || !body.role) {
      throw new BadRequestException("brandId, email, name, role are required");
    }
    const passwordHash = body.password ? await bcrypt.hash(body.password, 10) : null;
    return this.prisma.user.create({
      data: {
        brandId: body.brandId,
        email: body.email,
        name: body.name,
        role: body.role,
        teamId: body.teamId ?? null,
        title: body.title ?? null,
        managerId: body.managerId ?? null,
        positionId: body.positionId ?? null,
        passwordHash,
      },
    });
  }

  async update(id: string, body: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return this.prisma.user.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        role: body.role ?? undefined,
        teamId: body.teamId === null ? null : body.teamId ?? undefined,
        title: body.title === null ? null : body.title ?? undefined,
        managerId: body.managerId === null ? null : body.managerId ?? undefined,
        positionId: body.positionId === null ? null : body.positionId ?? undefined,
      },
    });
  }

  async remove(id: string, brandId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.brandId !== brandId) {
      throw new NotFoundException("User not found");
    }
    return this.prisma.user.delete({ where: { id } });
  }
}
