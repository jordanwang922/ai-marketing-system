import { Module } from "@nestjs/common";
import { GenerateController } from "./generate.controller";
import { GenerateService } from "./generate.service";
import { ViralLabStoreService } from "../store/store.service";
import { ViralLabLlmService } from "../llm/llm.service";

@Module({
  controllers: [GenerateController],
  providers: [GenerateService, ViralLabStoreService, ViralLabLlmService],
  exports: [GenerateService],
})
export class GenerateModule {}
