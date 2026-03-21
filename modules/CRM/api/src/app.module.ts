import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { LeadsModule } from "./leads/leads.module";
import { ExpertsModule } from "./experts/experts.module";
import { ConsultingModule } from "./consulting/consulting.module";
import { BrandsModule } from "./brands/brands.module";
import { TeamsModule } from "./teams/teams.module";
import { UsersModule } from "./users/users.module";
import { LogsModule } from "./logs/logs.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { PositionsModule } from "./positions/positions.module";
import { RiskRadarModule } from "./riskradar/riskradar.module";

@Module({
  imports: [
    LeadsModule,
    ExpertsModule,
    ConsultingModule,
    BrandsModule,
    TeamsModule,
    UsersModule,
    LogsModule,
    NotificationsModule,
    AuthModule,
    PositionsModule,
    RiskRadarModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
