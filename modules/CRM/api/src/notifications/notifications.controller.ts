import { Body, Controller, Get, Param, Patch, Post, Req, UnauthorizedException } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import { UpdateNotificationDto } from "./dto/update-notification.dto";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Req() req: any) {
    return this.notifications.list({ brandId: req.user.brandId, userId: req.user.id });
  }

  @Post()
  create(@Body() body: CreateNotificationDto, @Req() req: any) {
    if (req.user.role !== "manager") {
      throw new UnauthorizedException("Not allowed");
    }
    return this.notifications.create({ ...body, brandId: req.user.brandId });
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: UpdateNotificationDto, @Req() req: any) {
    return this.notifications.update(id, body);
  }
}
