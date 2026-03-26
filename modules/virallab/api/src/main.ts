import "reflect-metadata";
import * as dotenv from "dotenv";
import * as path from "node:path";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

const loadEnvironment = () => {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../../RiskRadar/server/.env"),
  ];

  for (const file of candidates) {
    dotenv.config({
      path: file,
      override: false,
    });
  }
};

loadEnvironment();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.setGlobalPrefix("api/virallab");
  await app.listen(Number(process.env.PORT || 3301));
}

bootstrap();
