import { Module } from "@nestjs/common";
import { AdDetectorController } from "./ad-detector.controller";
import { AdDetectorService } from "./ad-detector.service";
import { ViralLabStoreService } from "../store/store.service";
import { ViralLabLlmService } from "../llm/llm.service";
import { AuthService } from "../auth/auth.service";

@Module({
  controllers: [AdDetectorController],
  providers: [AdDetectorService, ViralLabStoreService, ViralLabLlmService, AuthService],
  exports: [AdDetectorService],
})
export class AdDetectorModule {}
