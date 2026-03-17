import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CreateLogDto } from "./dto/create-log.dto";

@Injectable()
export class LogsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { brandId?: string; entity?: string }) {
    if (!params.brandId) {
      return [];
    }
    return this.prisma.auditLog.findMany({
      where: {
        brandId: params.brandId,
        ...(params.entity ? { entity: params.entity } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(body: CreateLogDto) {
    if (!body.brandId || !body.action || !body.entity) {
      throw new BadRequestException("brandId, action, entity are required");
    }
    return this.prisma.auditLog.create({
      data: {
        brandId: body.brandId,
        action: body.action,
        entity: body.entity,
        entityId: body.entityId ?? null,
        actorId: body.actorId ?? null,
        payload: body.payload ?? undefined,
      },
    });
  }
}
