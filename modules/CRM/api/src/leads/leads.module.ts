import { Module } from "@nestjs/common";
import { LeadsController } from "./leads.controller";
import { LeadsService } from "./leads.service";
import { PrismaService } from "../prisma.service";
import { RiskRadarModule } from "../riskradar/riskradar.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { RiskRadarCallbackController } from "./riskradar-callback.controller";

@Module({
  imports: [RiskRadarModule, NotificationsModule],
  controllers: [LeadsController, RiskRadarCallbackController],
  providers: [LeadsService, PrismaService],
})
export class LeadsModule {}
