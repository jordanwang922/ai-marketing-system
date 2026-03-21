import { Module } from "@nestjs/common";
import { RiskRadarController } from "./riskradar.controller";
import { RiskRadarService } from "./riskradar.service";
@Module({
  controllers: [RiskRadarController],
  providers: [RiskRadarService],
  exports: [RiskRadarService],
})
export class RiskRadarModule {}
