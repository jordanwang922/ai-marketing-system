import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UnauthorizedException } from "@nestjs/common";
import { BrandsService } from "./brands.service";
import { CreateBrandDto } from "./dto/create-brand.dto";
import { UpdateBrandDto } from "./dto/update-brand.dto";

@Controller("brands")
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  @Get()
  list() {
    return this.brands.list();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.brands.get(id);
  }

  @Post()
  create(@Body() body: CreateBrandDto, @Req() req: any) {
    if (req.user?.role !== "manager") {
      throw new UnauthorizedException("Not allowed");
    }
    return this.brands.create(body);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: UpdateBrandDto, @Req() req: any) {
    if (req.user?.role !== "manager") {
      throw new UnauthorizedException("Not allowed");
    }
    return this.brands.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: any) {
    if (req.user?.role !== "manager") {
      throw new UnauthorizedException("Not allowed");
    }
    return this.brands.remove(id);
  }
}
