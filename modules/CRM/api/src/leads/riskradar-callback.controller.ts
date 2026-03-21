import { Body, Controller, Post, Req, UnauthorizedException } from "@nestjs/common";
import { LeadsService } from "./leads.service";
import { NotificationsService } from "../notifications/notifications.service";

@Controller("riskradar")
export class RiskRadarCallbackController {
  constructor(private readonly leads: LeadsService, private readonly notifications: NotificationsService) {}

  @Post("callback")
  async callback(@Body() body: any, @Req() req: any) {
    const token = String(process.env.RISKRADAR_CALLBACK_TOKEN || "");
    const auth = String(req.headers["authorization"] || "");
    if (token) {
      const expected = `Bearer ${token}`;
      if (auth !== expected) {
        throw new UnauthorizedException("Invalid callback token");
      }
    }

    const lead = await this.leads.applyRiskRadarResult({
      taskId: body.task_id,
      report: body.report,
      mode: body.mode,
      userId: body.user_id,
    });

    if (lead && lead.brandId) {
      const targetUserId = body.user_id || lead.ownerId || undefined;
      if (targetUserId) {
        await this.notifications.create({
          brandId: lead.brandId,
          userId: targetUserId,
          channel: "InApp",
          title: "RiskRadar 评估完成",
          body: `${lead.companyName} 已完成评估，可在 AI 评估页查看结果。`,
        });
      }
    }

    return { ok: true };
  }
}
