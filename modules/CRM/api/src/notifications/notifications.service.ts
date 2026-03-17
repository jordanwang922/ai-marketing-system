import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import { UpdateNotificationDto } from "./dto/update-notification.dto";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { brandId?: string; userId?: string }) {
    if (!params.brandId) {
      return [];
    }
    return this.prisma.notification.findMany({
      where: {
        brandId: params.brandId,
        ...(params.userId ? { userId: params.userId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(body: CreateNotificationDto) {
    if (!body.brandId || !body.userId || !body.title || !body.body) {
      throw new BadRequestException("brandId, userId, title, body are required");
    }
    return this.prisma.notification.create({
      data: {
        brandId: body.brandId,
        userId: body.userId,
        channel: body.channel ?? "InApp",
        title: body.title,
        body: body.body,
      },
    });
  }

  async update(id: string, body: UpdateNotificationDto) {
    const item = await this.prisma.notification.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException("Notification not found");
    }
    return this.prisma.notification.update({
      where: { id },
      data: {
        status: body.status ?? undefined,
      },
    });
  }
}
