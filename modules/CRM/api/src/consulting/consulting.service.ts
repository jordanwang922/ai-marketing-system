import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CreateConsultingCaseDto } from "./dto/create-consulting-case.dto";
import { UpdateConsultingCaseDto } from "./dto/update-consulting-case.dto";

@Injectable()
export class ConsultingService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { brandId?: string; leadId?: string }) {
    if (!params.brandId) {
      return [];
    }
    return this.prisma.consultingCase.findMany({
      where: {
        brandId: params.brandId,
        ...(params.leadId ? { leadId: params.leadId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(params: { id: string; brandId?: string }) {
    const item = await this.prisma.consultingCase.findUnique({ where: { id: params.id } });
    if (!item) {
      throw new NotFoundException("Consulting case not found");
    }
    if (params.brandId && item.brandId !== params.brandId) {
      throw new NotFoundException("Consulting case not found");
    }
    return item;
  }

  async create(body: CreateConsultingCaseDto) {
    if (!body.brandId || !body.leadId) {
      throw new BadRequestException("brandId and leadId are required");
    }
    return this.prisma.consultingCase.create({
      data: {
        brandId: body.brandId,
        leadId: body.leadId,
        expertId: body.expertId ?? null,
        status: body.status ?? "New",
        channel: body.channel ?? "Email",
        price: body.price ?? null,
        currency: body.currency ?? null,
        requirements: body.requirements ?? null,
        notes: body.notes ?? null,
      },
    });
  }

  async update(id: string, body: UpdateConsultingCaseDto) {
    const item = await this.prisma.consultingCase.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException("Consulting case not found");
    }
    return this.prisma.consultingCase.update({
      where: { id },
      data: {
        leadId: body.leadId ?? undefined,
        expertId: body.expertId ?? undefined,
        status: body.status ?? undefined,
        channel: body.channel ?? undefined,
        price: body.price ?? undefined,
        currency: body.currency ?? undefined,
        requirements: body.requirements ?? undefined,
        notes: body.notes ?? undefined,
      },
    });
  }

  async remove(id: string) {
    const item = await this.prisma.consultingCase.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException("Consulting case not found");
    }
    return this.prisma.consultingCase.delete({ where: { id } });
  }
}
