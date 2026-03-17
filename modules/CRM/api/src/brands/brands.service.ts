import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CreateBrandDto } from "./dto/create-brand.dto";
import { UpdateBrandDto } from "./dto/update-brand.dto";

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.brand.findMany({ orderBy: { createdAt: "desc" } });
  }

  async get(id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      throw new NotFoundException("Brand not found");
    }
    return brand;
  }

  async create(body: CreateBrandDto) {
    if (!body.name) {
      throw new BadRequestException("name is required");
    }
    return this.prisma.brand.create({ data: { name: body.name } });
  }

  async update(id: string, body: UpdateBrandDto) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      throw new NotFoundException("Brand not found");
    }
    return this.prisma.brand.update({
      where: { id },
      data: { name: body.name ?? undefined },
    });
  }

  async remove(id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      throw new NotFoundException("Brand not found");
    }
    return this.prisma.brand.delete({ where: { id } });
  }
}
