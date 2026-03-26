import { INestApplication, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  isEnabled() {
    return String(process.env.VIRALLAB_ENABLE_DB_MIRROR || "false") === "true" && Boolean(process.env.DATABASE_URL);
  }

  async onModuleInit() {
    if (!this.isEnabled()) {
      return;
    }
    await this.$connect();
    this.logger.log("Prisma persistence enabled.");
  }

  async enableShutdownHooks(_app: INestApplication) {
    if (!this.isEnabled()) {
      return;
    }
    _app.enableShutdownHooks();
  }
}
