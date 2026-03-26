import { Module } from "@nestjs/common";
import { SamplesController } from "./samples.controller";
import { SamplesService } from "./samples.service";
import { ViralLabStoreService } from "../store/store.service";

@Module({
  controllers: [SamplesController],
  providers: [SamplesService, ViralLabStoreService],
})
export class SamplesModule {}
