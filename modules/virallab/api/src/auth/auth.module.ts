import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { ViralLabStoreService } from "../store/store.service";

@Module({
  controllers: [AuthController],
  providers: [AuthService, ViralLabStoreService],
})
export class AuthModule {}
