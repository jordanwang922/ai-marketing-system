import { Module } from "@nestjs/common";
import { PositionsController } from "./positions.controller";
import { PositionsService } from "./positions.service";
import { PrismaService } from "../prisma.service";

@Module({
  controllers: [PositionsController],
  providers: [PositionsService, PrismaService],
})
export class PositionsModule {}
