import { Body, Controller, Get, Headers, Post } from "@nestjs/common";
import { PlatformService } from "./platform.service";

@Controller("platform-accounts")
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get()
  list(@Headers("authorization") authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, "").trim();
    return this.platformService.listAccounts(token);
  }

  @Post("xiaohongshu/cookies")
  saveXiaohongshuCookies(
    @Body() body: { accountName?: string; cookieBlob?: string },
    @Headers("authorization") authorization?: string,
  ) {
    const token = authorization?.replace(/^Bearer\s+/i, "").trim();
    return this.platformService.saveXiaohongshuCookie({ ...body, token });
  }

  @Post("xiaohongshu/verify")
  verifyXiaohongshuCookie(@Headers("authorization") authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, "").trim();
    return this.platformService.verifyXiaohongshuCookie({ token });
  }

  @Post("xiaohongshu/scan-login/start")
  startXiaohongshuScanLogin(
    @Body() body: { accountName?: string },
    @Headers("authorization") authorization?: string,
  ) {
    const token = authorization?.replace(/^Bearer\s+/i, "").trim();
    return this.platformService.startXiaohongshuScanLogin({ ...body, token });
  }

  @Post("xiaohongshu/scan-login/complete")
  completeXiaohongshuScanLogin(
    @Body() body: { sessionId?: string; accountName?: string; targetCount?: number },
    @Headers("authorization") authorization?: string,
  ) {
    const token = authorization?.replace(/^Bearer\s+/i, "").trim();
    return this.platformService.completeXiaohongshuScanLogin({ ...body, token });
  }

  @Post("xiaohongshu/scan-login/cancel")
  cancelXiaohongshuScanLogin(@Body() body: { sessionId?: string }) {
    return this.platformService.cancelXiaohongshuScanLogin(body);
  }
}
