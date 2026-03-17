import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UnauthorizedException } from "@nestjs/common";
import { ConsultingService } from "./consulting.service";
import { CreateConsultingCaseDto } from "./dto/create-consulting-case.dto";
import { UpdateConsultingCaseDto } from "./dto/update-consulting-case.dto";

@Controller("consulting")
export class ConsultingController {
  constructor(private readonly consulting: ConsultingService) {}

  @Get()
  list(@Req() req: any) {
    return this.consulting.list({ brandId: req.user.brandId });
  }

  @Get(":id")
  get(@Param("id") id: string, @Req() req: any) {
    return this.consulting.get({ id, brandId: req.user.brandId });
  }

  @Post()
  create(@Body() body: CreateConsultingCaseDto, @Req() req: any) {
    if (req.user.role === "member") {
      throw new UnauthorizedException("Not allowed");
    }
    return this.consulting.create({ ...body, brandId: req.user.brandId });
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: UpdateConsultingCaseDto, @Req() req: any) {
    if (req.user.role === "member") {
      throw new UnauthorizedException("Not allowed");
    }
    return this.consulting.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: any) {
    if (req.user.role === "member") {
      throw new UnauthorizedException("Not allowed");
    }
    return this.consulting.remove(id);
  }
}
