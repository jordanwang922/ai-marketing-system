import { Module } from "@nestjs/common";
import { PatternsController } from "./patterns.controller";
import { PatternsService } from "./patterns.service";
import { ViralLabStoreService } from "../store/store.service";
import { ViralLabLlmService } from "../llm/llm.service";

@Module({
  controllers: [PatternsController],
  providers: [PatternsService, ViralLabStoreService, ViralLabLlmService],
  exports: [PatternsService],
})
export class PatternsModule {}
