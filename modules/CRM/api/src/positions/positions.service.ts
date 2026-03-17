import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CreatePositionDto } from "./dto/create-position.dto";
import { UpdatePositionDto } from "./dto/update-position.dto";

@Injectable()
export class PositionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(brandId: string) {
    if (!brandId) return [];
    return this.prisma.position.findMany({ where: { brandId }, orderBy: { level: "asc" } });
  }

  async create(brandId: string, body: CreatePositionDto) {
    if (!body.name) {
      throw new BadRequestException("name is required");
    }
    return this.prisma.position.create({
      data: {
        brandId,
        name: body.name,
        level: body.level ?? null,
      },
    });
  }

  async update(id: string, body: UpdatePositionDto, brandId: string) {
    const position = await this.prisma.position.findUnique({ where: { id } });
    if (!position || position.brandId !== brandId) {
      throw new NotFoundException("Position not found");
    }
    return this.prisma.position.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        level: body.level === null ? null : body.level ?? undefined,
      },
    });
  }

  async remove(id: string, brandId: string) {
    const position = await this.prisma.position.findUnique({ where: { id } });
    if (!position || position.brandId !== brandId) {
      throw new NotFoundException("Position not found");
    }
    return this.prisma.position.delete({ where: { id } });
  }
}
