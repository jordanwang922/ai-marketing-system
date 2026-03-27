import { Module } from "@nestjs/common";
import { CollectController } from "./collect.controller";
import { CollectService } from "./collect.service";
import { ViralLabStoreService } from "../store/store.service";
import { AuthService } from "../auth/auth.service";
import { AdDetectorService } from "../ad-detector/ad-detector.service";
import { ViralLabLlmService } from "../llm/llm.service";

@Module({
  controllers: [CollectController],
  providers: [CollectService, ViralLabStoreService, AuthService, AdDetectorService, ViralLabLlmService],
})
export class CollectModule {}
