import { Body, Controller, Get, Post, Req, UnauthorizedException } from "@nestjs/common";
import { LogsService } from "./logs.service";
import { CreateLogDto } from "./dto/create-log.dto";

@Controller("logs")
export class LogsController {
  constructor(private readonly logs: LogsService) {}

  @Get()
  list(@Req() req: any) {
    return this.logs.list({ brandId: req.user.brandId });
  }

  @Post()
  create(@Body() body: CreateLogDto, @Req() req: any) {
    if (req.user.role !== "manager") {
      throw new UnauthorizedException("Not allowed");
    }
    return this.logs.create({ ...body, brandId: req.user.brandId, actorId: req.user.id });
  }
}
