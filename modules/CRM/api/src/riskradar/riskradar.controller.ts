import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import { RiskRadarService } from "./riskradar.service";

@Controller("riskradar")
export class RiskRadarController {
  constructor(private readonly riskradar: RiskRadarService) {}

  @Post("evaluate")
  async evaluate(@Body() body: any, @Req() req: any) {
    const payload = {
      company_name: body.company_name,
      country: body.country || "中国",
      mode: body.mode || "quick",
      locale: body.locale || "zh-CN",
      user_id: req.user.id,
      tenant_id: req.user.brandId,
      client_ref: body.client_ref,
    };
    return this.riskradar.evaluate(payload);
  }

  @Get("task/:id")
  async task(@Param("id") id: string) {
    return this.riskradar.task(id);
  }

  @Get("report")
  async report(@Query() query: any) {
    return this.riskradar.report({
      company_name: query.company_name,
      country: query.country || "中国",
      mode: query.mode || "quick",
      locale: query.locale || "zh-CN",
    });
  }

  // 回调由 LeadsModule 内的控制器处理（避免循环依赖）
}
