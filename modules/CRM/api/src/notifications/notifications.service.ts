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
    if (!body.brandId || !body.title || !body.body) {
      throw new BadRequestException("brandId, title, body are required");
    }

    const targetType = body.targetType ?? (body.userId ? "user" : "user");
    const targetUserId = body.targetUserId ?? body.userId;

    if (targetType === "all") {
      const users = await this.prisma.user.findMany({
        where: { brandId: body.brandId },
        select: { id: true },
      });
      if (users.length === 0) {
        throw new BadRequestException("No users found for brand");
      }
      const data = users.map((user) => ({
        brandId: body.brandId,
        userId: user.id,
        channel: body.channel ?? "InApp",
        title: body.title,
        body: body.body,
      }));
      const result = await this.prisma.notification.createMany({ data });
      return { count: result.count };
    }

    if (!targetUserId) {
      throw new BadRequestException("targetUserId is required");
    }

    if (targetType === "group") {
      const users = await this.prisma.user.findMany({
        where: { brandId: body.brandId },
        select: { id: true, managerId: true },
      });
      const childrenMap = new Map<string, string[]>();
      for (const user of users) {
        if (!user.managerId) continue;
        const list = childrenMap.get(user.managerId) ?? [];
        list.push(user.id);
        childrenMap.set(user.managerId, list);
      }
      const queue = [targetUserId];
      const visited = new Set<string>();
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);
        const children = childrenMap.get(current) ?? [];
        queue.push(...children);
      }
      if (visited.size === 0) {
        throw new BadRequestException("No users found for target group");
      }
      const data = Array.from(visited).map((userId) => ({
        brandId: body.brandId,
        userId,
        channel: body.channel ?? "InApp",
        title: body.title,
        body: body.body,
      }));
      const result = await this.prisma.notification.createMany({ data });
      return { count: result.count };
    }

    return this.prisma.notification.create({
      data: {
        brandId: body.brandId,
        userId: targetUserId,
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
