import { Module } from "@nestjs/common";
import { OverviewController } from "./overview.controller";
import { ViralLabStoreService } from "../store/store.service";
import { PrismaService } from "../prisma.service";

@Module({
  controllers: [OverviewController],
  providers: [ViralLabStoreService, PrismaService],
  exports: [ViralLabStoreService],
})
export class OverviewModule {}
