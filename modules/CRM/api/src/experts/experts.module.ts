import { Module } from "@nestjs/common";
import { ExpertsController } from "./experts.controller";
import { ExpertsService } from "./experts.service";
import { PrismaService } from "../prisma.service";

@Module({
  controllers: [ExpertsController],
  providers: [ExpertsService, PrismaService],
})
export class ExpertsModule {}
