import { Module } from "@nestjs/common";
import { PlatformController } from "./platform.controller";
import { PlatformService } from "./platform.service";
import { ViralLabStoreService } from "../store/store.service";
import { AuthService } from "../auth/auth.service";

@Module({
  controllers: [PlatformController],
  providers: [PlatformService, ViralLabStoreService, AuthService],
})
export class PlatformModule {}
