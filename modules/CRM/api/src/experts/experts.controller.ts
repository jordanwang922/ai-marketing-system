import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UnauthorizedException } from "@nestjs/common";
import { ExpertsService } from "./experts.service";
import { CreateExpertDto } from "./dto/create-expert.dto";
import { UpdateExpertDto } from "./dto/update-expert.dto";

@Controller("experts")
export class ExpertsController {
  constructor(private readonly experts: ExpertsService) {}

  @Get()
  list(@Req() req: any) {
    return this.experts.list({ brandId: req.user.brandId });
  }

  @Get(":id")
  get(@Param("id") id: string, @Req() req: any) {
    return this.experts.get({ id, brandId: req.user.brandId });
  }

  @Post()
  create(@Body() body: CreateExpertDto, @Req() req: any) {
    if (req.user.role === "member") {
      throw new UnauthorizedException("Not allowed");
    }
    return this.experts.create({ ...body, brandId: req.user.brandId });
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: UpdateExpertDto, @Req() req: any) {
    if (req.user.role === "member") {
      throw new UnauthorizedException("Not allowed");
    }
    return this.experts.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: any) {
    if (req.user.role === "member") {
      throw new UnauthorizedException("Not allowed");
    }
    return this.experts.remove(id);
  }
}
