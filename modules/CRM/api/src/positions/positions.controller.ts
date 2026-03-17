import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UnauthorizedException } from "@nestjs/common";
import { PositionsService } from "./positions.service";
import { CreatePositionDto } from "./dto/create-position.dto";
import { UpdatePositionDto } from "./dto/update-position.dto";

@Controller("positions")
export class PositionsController {
  constructor(private readonly positions: PositionsService) {}

  @Get()
  list(@Req() req: any) {
    return this.positions.list(req.user.brandId);
  }

  @Post()
  create(@Body() body: CreatePositionDto, @Req() req: any) {
    if (req.user.role !== "manager") {
      throw new UnauthorizedException("Not allowed");
    }
    return this.positions.create(req.user.brandId, body);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: UpdatePositionDto, @Req() req: any) {
    if (req.user.role !== "manager") {
      throw new UnauthorizedException("Not allowed");
    }
    return this.positions.update(id, body, req.user.brandId);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: any) {
    if (req.user.role !== "manager") {
      throw new UnauthorizedException("Not allowed");
    }
    return this.positions.remove(id, req.user.brandId);
  }
}
