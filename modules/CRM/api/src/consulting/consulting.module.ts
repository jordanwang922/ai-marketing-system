import { Module } from "@nestjs/common";
import { ConsultingController } from "./consulting.controller";
import { ConsultingService } from "./consulting.service";
import { PrismaService } from "../prisma.service";

@Module({
  controllers: [ConsultingController],
  providers: [ConsultingService, PrismaService],
})
export class ConsultingModule {}
