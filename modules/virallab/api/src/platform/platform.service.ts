import { Injectable, OnModuleDestroy } from "@nestjs/common";
import * as path from "node:path";
import { createRequire } from "node:module";
import { execFile } from "node:child_process";
import { rm } from "node:fs/promises";
import { AuthService } from "../auth/auth.service";
import { ViralLabStoreService } from "../store/store.service";
import { XiaohongshuCollector } from "../collect/xiaohongshu.collector";
import { PrismaService } from "../prisma.service";

type ScanSessionHandle = {
  id: string;
  userId: string;
  accountName: string;
  userDataDir: string;
  browser: {
    close: () => Promise<void>;
  };
  context: {
    cookies: (urls?: string[] | string) => Promise<Array<{ name: string; value: string }>>;
    close: () => Promise<void>;
  };
  page: {
    url: () => string;
  };
  latestSearchNotesRequestJson: string | null;
  startedAt: string;
};

@Injectable()
export class PlatformService implements OnModuleDestroy {
  private readonly xiaohongshuCollector = new XiaohongshuCollector();
  private readonly scanSessions = new Map<string, ScanSessionHandle>();

  constructor(
    private readonly store: ViralLabStoreService,
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleDestroy() {
    await Promise.all([...this.scanSessions.values()].map((session) => this.closeScanSession(session.id)));
  }

  private loadPlaywright() {
    const workerPlaywrightPath = path.resolve(__dirname, "../../../worker/node_modules/playwright");
    const require = createRequire(__filename);
    return require(workerPlaywrightPath) as {
      chromium: {
        launchPersistentContext: (
          userDataDir: string,
          options: Record<string, unknown>,
        ) => Promise<{
          pages: () => Array<{
            goto: (url: string, options?: Record<string, unknown>) => Promise<void>;
            waitForLoadState: (state?: string, options?: Record<string, unknown>) => Promise<void>;
            bringToFront?: () => Promise<void>;
            url: () => string;
            on: (
              event: "request",
              listener: (request: { url: () => string; postData: () => string | null }) => void,
            ) => void;
          }>;
          newPage: () => Promise<{
            goto: (url: string, options?: Record<string, unknown>) => Promise<void>;
            waitForLoadState: (state?: string, options?: Record<string, unknown>) => Promise<void>;
            bringToFront?: () => Promise<void>;
            url: () => string;
            on: (
              event: "request",
              listener: (request: { url: () => string; postData: () => string | null }) => void,
            ) => void;
          }>;
          cookies: (urls?: string[] | string) => Promise<Array<{ name: string; value: string }>>;
          close: () => Promise<void>;
        }>;
        launch: (options: Record<string, unknown>) => Promise<{
          newContext: (options?: Record<string, unknown>) => Promise<{
          newPage: () => Promise<{
            goto: (url: string, options?: Record<string, unknown>) => Promise<void>;
            waitForLoadState: (state?: string, options?: Record<string, unknown>) => Promise<void>;
            bringToFront?: () => Promise<void>;
            url: () => string;
            on: (
              event: "request",
              listener: (request: { url: () => string; postData: () => string | null }) => void,
            ) => void;
          }>;
            cookies: (urls?: string[] | string) => Promise<Array<{ name: string; value: string }>>;
            close: () => Promise<void>;
          }>;
          close: () => Promise<void>;
        }>;
      };
    };
  }

  private async closeScanSession(sessionId: string) {
    const session = this.scanSessions.get(sessionId);
    if (!session) return;
    this.scanSessions.delete(sessionId);
    try {
      await session.context.close();
    } catch {
      // ignore close errors during teardown
    }
    try {
      await session.browser.close();
    } catch {
      // ignore close errors during teardown
    }
    await rm(session.userDataDir, { recursive: true, force: true }).catch(() => {
      // ignore cleanup failures for scan browser profiles
    });
  }

  private async activateBrowserWindow() {
    const browserNames = ["Google Chrome for Testing", "Chromium", "Google Chrome"];
    for (const name of browserNames) {
      await new Promise<void>((resolve) => {
        execFile("osascript", ["-e", `tell application "${name}" to activate`], () => resolve());
      });
    }
  }

  private serializeCookies(cookies: Array<{ name: string; value: string }>) {
    return cookies
      .filter((cookie) => cookie.name && cookie.value)
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");
  }

  private parseVerificationMetadata(value: string | null) {
    if (!value) return null;
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private normalizeAccount<T extends { verificationMetadataJson: string | null }>(account: T) {
    return {
      ...account,
      verificationMetadata: this.parseVerificationMetadata(account.verificationMetadataJson),
    };
  }

  private mapAccountRecord(item: {
    id: string;
    userId: string;
    platform: string;
    accountName: string | null;
    cookieBlob: string | null;
    cookieStatus: string;
    lastVerifiedAt: Date | null;
    verificationMessage: string | null;
    verificationMetadataJson: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: item.id,
      userId: item.userId,
      platform: item.platform as "xiaohongshu",
      accountName: item.accountName || "Xiaohongshu Account",
      cookieBlob: item.cookieBlob || "",
      cookieStatus: item.cookieStatus as "missing" | "saved" | "verified" | "invalid",
      lastVerifiedAt: item.lastVerifiedAt?.toISOString() || null,
      verificationMessage: item.verificationMessage,
      verificationMetadataJson: item.verificationMetadataJson,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private async resolveUserId(token?: string) {
    return this.authService.resolveUserIdOrDefault(token);
  }

  private async syncAccountToJson(account: {
    id: string;
    userId: string;
    platform: "xiaohongshu";
    accountName: string;
    cookieBlob: string;
    cookieStatus: "missing" | "saved" | "verified" | "invalid";
    lastVerifiedAt: string | null;
    verificationMessage: string | null;
    verificationMetadataJson: string | null;
    createdAt: string;
    updatedAt: string;
  }) {
    await this.store.mutate((db) => {
      const local = db.platformAccounts.find((item) => item.id === account.id);
      if (local) {
        Object.assign(local, account);
      } else {
        db.platformAccounts.push(account);
      }
      return null;
    });
  }

  private async appendAuditLog(entry: {
    userId: string;
    action: string;
    targetId: string;
    payloadJson: string;
    createdAt: string;
  }) {
    await this.store.mutate((db) => {
      db.auditLogs.push({
        id: this.store.createId("log"),
        userId: entry.userId,
        action: entry.action,
        targetType: "platform_account",
        targetId: entry.targetId,
        payloadJson: entry.payloadJson,
        createdAt: entry.createdAt,
      });
      return null;
    });
  }

  async listAccounts(token?: string) {
    if (this.prisma.isEnabled()) {
      const userId = await this.resolveUserId(token);
      const items = await this.prisma.platformAccount.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      return {
        success: true,
        items: items.map((item) => this.normalizeAccount(this.mapAccountRecord(item))),
      };
    }

    const user = await this.authService.resolveUserFromToken(token);
    const db = await this.store.read();
    const userId = user?.id || db.users[0]?.id || "user_demo";
    return {
      success: true,
      items: db.platformAccounts.filter((item) => item.userId === userId).map((item) => this.normalizeAccount(item)),
    };
  }

  async startXiaohongshuScanLogin(payload: { token?: string; accountName?: string; keyword?: string }) {
    const userId = await this.resolveUserId(payload.token);
    const existing = [...this.scanSessions.values()].find((session) => session.userId === userId);
    if (existing) {
      await this.closeScanSession(existing.id);
    }

    const playwright = this.loadPlaywright();
    const sessionId = this.store.createId("scan");
    const userDataDir = path.resolve(process.cwd(), `.scan-session/chrome-${sessionId}`);
    const context = await playwright.chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: ["--new-window"],
    });
    const page = context.pages()[0] || (await context.newPage());
    const entryUrl = "https://www.xiaohongshu.com/";
    page.on("request", (request) => {
      if (!request.url().includes("/api/sns/web/v1/search/notes")) return;
      const raw = request.postData();
      const session = this.scanSessions.get(sessionId);
      if (!session || !raw) return;
      session.latestSearchNotesRequestJson = raw;
    });
    await page.goto(entryUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.bringToFront?.().catch(() => {
      // Ignore if the browser backend does not support explicit focus.
    });
    await this.activateBrowserWindow().catch(() => {
      // Ignore macOS activation failures and continue with the scan session.
    });
    await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {
      // Xiaohongshu may keep polling; domcontentloaded is enough for QR flow.
    });

    this.scanSessions.set(sessionId, {
      id: sessionId,
      userId,
      accountName: String(payload.accountName || "Xiaohongshu Account"),
      userDataDir,
      browser: {
        close: async () => {},
      },
      context,
      page,
      latestSearchNotesRequestJson: null,
      startedAt: new Date().toISOString(),
    });

    return {
      success: true,
      sessionId,
      status: "waiting_for_scan",
      entryUrl,
      message: "Xiaohongshu login window opened. Scan the QR code, then return and click complete.",
    };
  }

  async completeXiaohongshuScanLogin(payload: { token?: string; sessionId?: string; accountName?: string }) {
    const sessionId = String(payload.sessionId || "");
    const session = this.scanSessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        verified: false,
        errorMessage: "Scan session not found or already closed.",
        item: null,
      };
    }

    try {
      const cookies = await session.context.cookies([
        "https://www.xiaohongshu.com",
        "https://edith.xiaohongshu.com",
      ]);
      const cookieBlob = this.serializeCookies(cookies);
      const visibleUrl = session.page.url();
      const manualSearchRequestData = session.latestSearchNotesRequestJson
        ? (() => {
            try {
              return JSON.parse(session.latestSearchNotesRequestJson) as Record<string, unknown>;
            } catch {
              return null;
            }
          })()
        : null;
      if (!cookieBlob || !cookieBlob.includes("web_session")) {
        return {
          success: false,
          verified: false,
          errorMessage: "Login appears incomplete. Please finish scanning and make sure Xiaohongshu is fully logged in before clicking complete.",
          item: null,
          metadata: {
            visibleUrl,
          },
        };
      }

      const saved = await this.saveXiaohongshuCookie({
        token: payload.token,
        accountName: payload.accountName || session.accountName,
        cookieBlob,
      });
      return {
        success: true,
        verified: true,
        errorMessage: null,
        metadata: {
          visibleUrl,
          cookieCaptured: true,
          manualCapture: {
            manualSearchPageUrl: visibleUrl,
            manualSearchRequestData,
          },
        },
        item: saved.item,
      };
    } catch (error) {
      return {
        success: false,
        verified: false,
        errorMessage:
          error instanceof Error
            ? `Unable to capture the current Xiaohongshu page: ${error.message}`
            : "Unable to capture the current Xiaohongshu page.",
        item: null,
      };
    }
  }

  async cancelXiaohongshuScanLogin(payload: { sessionId?: string }) {
    const sessionId = String(payload.sessionId || "");
    if (!sessionId || !this.scanSessions.has(sessionId)) {
      return { success: true };
    }
    await this.closeScanSession(sessionId);
    return { success: true };
  }

  async saveXiaohongshuCookie(payload: { accountName?: string; cookieBlob?: string; token?: string }) {
    if (this.prisma.isEnabled()) {
      const userId = await this.resolveUserId(payload.token);
      const timestamp = new Date().toISOString();
      const existed = await this.prisma.platformAccount.findFirst({
        where: { userId, platform: "xiaohongshu" },
      });

      if (existed) {
        await this.prisma.platformAccount.update({
          where: { id: existed.id },
          data: {
            accountName: String(payload.accountName || existed.accountName || "Xiaohongshu Account"),
            cookieBlob: String(payload.cookieBlob || ""),
            cookieStatus: payload.cookieBlob ? "saved" : "missing",
            lastVerifiedAt: null,
            verificationMessage: null,
            verificationMetadataJson: null,
            updatedAt: new Date(timestamp),
          },
        });

        const item = {
          id: existed.id,
          userId,
          platform: "xiaohongshu" as const,
          accountName: String(payload.accountName || existed.accountName || "Xiaohongshu Account"),
          cookieBlob: String(payload.cookieBlob || ""),
          cookieStatus: payload.cookieBlob ? ("saved" as const) : ("missing" as const),
          lastVerifiedAt: null,
          verificationMessage: null,
          verificationMetadataJson: null,
          createdAt: existed.createdAt.toISOString(),
          updatedAt: timestamp,
        };

        await this.syncAccountToJson(item);

        return { success: true, item: this.normalizeAccount(item) };
      }

      const item = {
        id: this.store.createId("platform"),
        userId,
        platform: "xiaohongshu" as const,
        accountName: String(payload.accountName || "Xiaohongshu Account"),
        cookieBlob: String(payload.cookieBlob || ""),
        cookieStatus: payload.cookieBlob ? ("saved" as const) : ("missing" as const),
        lastVerifiedAt: null,
        verificationMessage: null,
        verificationMetadataJson: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      await this.prisma.platformAccount.create({
        data: {
          id: item.id,
          userId: item.userId,
          platform: item.platform,
          accountName: item.accountName,
          cookieBlob: item.cookieBlob,
          cookieStatus: item.cookieStatus,
          lastVerifiedAt: null,
          verificationMessage: null,
          verificationMetadataJson: null,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        },
      });

      await this.syncAccountToJson(item);

      return { success: true, item: this.normalizeAccount(item) };
    }

    const user = await this.authService.resolveUserFromToken(payload.token);
    return this.store.mutate((db) => {
      const userId = user?.id || db.users[0]?.id || "user_demo";
      const timestamp = new Date().toISOString();
      const existed = db.platformAccounts.find(
        (item) => item.userId === userId && item.platform === "xiaohongshu",
      );

      if (existed) {
        existed.accountName = String(payload.accountName || existed.accountName || "Xiaohongshu Account");
        existed.cookieBlob = String(payload.cookieBlob || "");
        existed.cookieStatus = payload.cookieBlob ? "saved" : "missing";
        existed.lastVerifiedAt = null;
        existed.verificationMessage = null;
        existed.verificationMetadataJson = null;
        existed.updatedAt = timestamp;
        return { success: true, item: this.normalizeAccount(existed) };
      }

      const item = {
        id: this.store.createId("platform"),
        userId,
        platform: "xiaohongshu" as const,
        accountName: String(payload.accountName || "Xiaohongshu Account"),
        cookieBlob: String(payload.cookieBlob || ""),
        cookieStatus: payload.cookieBlob ? ("saved" as const) : ("missing" as const),
        lastVerifiedAt: null,
        verificationMessage: null,
        verificationMetadataJson: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.platformAccounts.push(item);
      return { success: true, item: this.normalizeAccount(item) };
    });
  }

  async verifyXiaohongshuCookie(payload: { token?: string }) {
    let userId = "user_demo";
    let account:
      | {
          id: string;
          cookieBlob: string;
        }
      | undefined;

    if (this.prisma.isEnabled()) {
      userId = await this.resolveUserId(payload.token);
      const prismaAccount = await this.prisma.platformAccount.findFirst({
        where: { userId, platform: "xiaohongshu" },
      });
      account = prismaAccount
        ? {
            id: prismaAccount.id,
            cookieBlob: prismaAccount.cookieBlob || "",
          }
        : undefined;
    } else {
      const user = await this.authService.resolveUserFromToken(payload.token);
      const db = await this.store.read();
      userId = user?.id || db.users[0]?.id || "user_demo";
      const fileAccount = db.platformAccounts.find((item) => item.userId === userId && item.platform === "xiaohongshu");
      account = fileAccount
        ? {
            id: fileAccount.id,
            cookieBlob: fileAccount.cookieBlob,
          }
        : undefined;
    }

    if (!account?.cookieBlob) {
      return {
        success: false,
        verified: false,
        errorMessage: "No Xiaohongshu cookie has been saved for the current account.",
        item: null,
      };
    }

    const result = await this.xiaohongshuCollector.verifyCookie({ cookieBlob: account.cookieBlob });

    if (this.prisma.isEnabled()) {
      const timestamp = new Date().toISOString();
      const verificationMetadataJson = JSON.stringify(result.metadata || null);
      await this.prisma.platformAccount.update({
        where: { id: account.id },
        data: {
          cookieStatus: result.verified ? "verified" : "invalid",
          lastVerifiedAt: new Date(timestamp),
          verificationMessage: result.errorMessage || (result.verified ? "Cookie verified successfully." : null),
          verificationMetadataJson,
          updatedAt: new Date(timestamp),
        },
      });

      const updatedAccount = await this.prisma.platformAccount.findUnique({
        where: { id: account.id },
      });
      if (updatedAccount) {
        await this.syncAccountToJson(this.mapAccountRecord(updatedAccount));
      }
      await this.appendAuditLog({
        userId,
        action: result.verified ? "platform_cookie_verified" : "platform_cookie_invalid",
        targetId: account.id,
        payloadJson: JSON.stringify({
          platform: "xiaohongshu",
          verified: result.verified,
          reason:
            result.metadata && typeof result.metadata === "object" && "reason" in result.metadata
              ? result.metadata.reason
              : null,
          errorMessage: result.errorMessage || null,
        }),
        createdAt: timestamp,
      });

      return {
        success: result.success,
        verified: result.verified,
        errorMessage: result.errorMessage || null,
        metadata: result.metadata,
        item: updatedAccount
          ? this.normalizeAccount(this.mapAccountRecord(updatedAccount))
          : null,
      };
    }

    return this.store.mutate((nextDb) => {
      const target = nextDb.platformAccounts.find((item) => item.id === account.id);
      if (!target) {
        return {
          success: false,
          verified: false,
          errorMessage: "Platform account no longer exists.",
          item: null,
        };
      }

      const timestamp = new Date().toISOString();
      target.cookieStatus = result.verified ? "verified" : "invalid";
      target.lastVerifiedAt = timestamp;
      target.verificationMessage = result.errorMessage || (result.verified ? "Cookie verified successfully." : null);
      target.verificationMetadataJson = JSON.stringify(result.metadata || null);
      target.updatedAt = timestamp;

      nextDb.auditLogs.push({
        id: this.store.createId("log"),
        userId,
        action: result.verified ? "platform_cookie_verified" : "platform_cookie_invalid",
        targetType: "platform_account",
        targetId: target.id,
        payloadJson: JSON.stringify({
          platform: "xiaohongshu",
          verified: result.verified,
          reason:
            result.metadata && typeof result.metadata === "object" && "reason" in result.metadata
              ? result.metadata.reason
              : null,
          errorMessage: result.errorMessage || null,
        }),
        createdAt: timestamp,
      });

      return {
        success: result.success,
        verified: result.verified,
        errorMessage: result.errorMessage || null,
        metadata: result.metadata,
        item: this.normalizeAccount(target),
      };
    });
  }
}
