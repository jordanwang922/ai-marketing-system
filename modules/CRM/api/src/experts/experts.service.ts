import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CreateExpertDto } from "./dto/create-expert.dto";
import { UpdateExpertDto } from "./dto/update-expert.dto";

@Injectable()
export class ExpertsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { brandId?: string }) {
    if (!params.brandId) {
      return [];
    }
    return this.prisma.expert.findMany({
      where: { brandId: params.brandId },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(params: { id: string; brandId?: string }) {
    const expert = await this.prisma.expert.findUnique({ where: { id: params.id } });
    if (!expert) {
      throw new NotFoundException("Expert not found");
    }
    if (params.brandId && expert.brandId !== params.brandId) {
      throw new NotFoundException("Expert not found");
    }
    return expert;
  }

  async create(body: CreateExpertDto) {
    if (!body.brandId || !body.name) {
      throw new BadRequestException("brandId and name are required");
    }
    return this.prisma.expert.create({
      data: {
        brandId: body.brandId,
        name: body.name,
        country: body.country ?? null,
        background: body.background ?? null,
        specialties: body.specialties ?? null,
        pricing: body.pricing ?? null,
        pricingCurrency: body.pricingCurrency ?? null,
        pricingUnit: body.pricingUnit ?? null,
        contactEmail: body.contactEmail ?? null,
        phone: body.phone ?? null,
        notes: body.notes ?? null,
      },
    });
  }

  async update(id: string, body: UpdateExpertDto) {
    const expert = await this.prisma.expert.findUnique({ where: { id } });
    if (!expert) {
      throw new NotFoundException("Expert not found");
    }
    return this.prisma.expert.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        country: body.country ?? undefined,
        background: body.background ?? undefined,
        specialties: body.specialties ?? undefined,
        pricing: body.pricing ?? undefined,
        pricingCurrency: body.pricingCurrency ?? undefined,
        pricingUnit: body.pricingUnit ?? undefined,
        contactEmail: body.contactEmail ?? undefined,
        phone: body.phone ?? undefined,
        notes: body.notes ?? undefined,
      },
    });
  }

  async remove(id: string) {
    const expert = await this.prisma.expert.findUnique({ where: { id } });
    if (!expert) {
      throw new NotFoundException("Expert not found");
    }
    return this.prisma.expert.delete({ where: { id } });
  }
}
