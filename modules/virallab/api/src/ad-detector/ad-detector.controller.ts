import { Body, Controller, Get, Put } from "@nestjs/common";
import { AdDetectorService } from "./ad-detector.service";
import { AuthService } from "../auth/auth.service";

@Controller("ad-detector")
export class AdDetectorController {
  constructor(
    private readonly adDetectorService: AdDetectorService,
    private readonly authService: AuthService,
  ) {}

  @Get("config")
  async getConfig() {
    const userId = await this.authService.resolveUserIdOrDefault();
    return {
      success: true,
      item: await this.adDetectorService.getConfig(userId),
    };
  }

  @Put("config")
  async updateConfig(
    @Body()
    body: {
      enabled?: boolean;
      threshold?: number;
      systemPrompt?: string;
      userPrompt?: string;
    },
  ) {
    const userId = await this.authService.resolveUserIdOrDefault();
    return {
      success: true,
      item: await this.adDetectorService.updateConfig(userId, body),
    };
  }

  @Get("library")
  async listLibrary() {
    const userId = await this.authService.resolveUserIdOrDefault();
    return {
      success: true,
      items: await this.adDetectorService.listLibrary(userId),
    };
  }

  @Get("runs")
  async listRuns() {
    const userId = await this.authService.resolveUserIdOrDefault();
    return {
      success: true,
      items: await this.adDetectorService.listRuns(userId),
    };
  }
}
