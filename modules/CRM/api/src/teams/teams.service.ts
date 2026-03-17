import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CreateTeamDto } from "./dto/create-team.dto";
import { UpdateTeamDto } from "./dto/update-team.dto";

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { brandId?: string }) {
    if (!params.brandId) {
      return [];
    }
    return this.prisma.team.findMany({
      where: { brandId: params.brandId },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(params: { id: string; brandId?: string }) {
    const team = await this.prisma.team.findUnique({ where: { id: params.id } });
    if (!team) {
      throw new NotFoundException("Team not found");
    }
    if (params.brandId && team.brandId !== params.brandId) {
      throw new NotFoundException("Team not found");
    }
    return team;
  }

  async create(body: CreateTeamDto) {
    if (!body.brandId || !body.name) {
      throw new BadRequestException("brandId and name are required");
    }
    return this.prisma.team.create({
      data: {
        brandId: body.brandId,
        name: body.name,
        leaderId: body.leaderId ?? null,
      },
    });
  }

  async update(id: string, body: UpdateTeamDto) {
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team) {
      throw new NotFoundException("Team not found");
    }
    return this.prisma.team.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        leaderId: body.leaderId === null ? null : body.leaderId ?? undefined,
      },
    });
  }

  async remove(id: string) {
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team) {
      throw new NotFoundException("Team not found");
    }
    return this.prisma.team.delete({ where: { id } });
  }
}
