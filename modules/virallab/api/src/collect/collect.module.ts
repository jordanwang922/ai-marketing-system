import { Module } from "@nestjs/common";
import { CollectController } from "./collect.controller";
import { CollectService } from "./collect.service";
import { ViralLabStoreService } from "../store/store.service";
import { AuthService } from "../auth/auth.service";

@Module({
  controllers: [CollectController],
  providers: [CollectService, ViralLabStoreService, AuthService],
})
export class CollectModule {}
