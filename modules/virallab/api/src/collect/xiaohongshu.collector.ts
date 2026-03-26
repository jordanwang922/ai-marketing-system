import * as path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  CollectRequest,
  CollectorContext,
  CollectorReadiness,
  CollectorRunResult,
  CollectorVerificationResult,
  ViralLabCollectorProvider,
} from "./collector.types";

const execFileAsync = promisify(execFile);

export class XiaohongshuCollector implements ViralLabCollectorProvider {
  readonly id = "xiaohongshu-playwright" as const;
  readonly mode = "real" as const;
  readonly platform = "xiaohongshu" as const;

  private async runWorker(payload: Record<string, unknown>) {
    const runnerPath = path.resolve(process.cwd(), "../worker/src/run-xiaohongshu-collector.js");

    const { stdout } = await execFileAsync("node", [runnerPath, JSON.stringify(payload)]);
    return JSON.parse(stdout) as CollectorRunResult;
  }

  async collect(request: CollectRequest, options?: CollectorContext): Promise<CollectorRunResult> {
    if (!process.env.VIRALLAB_ENABLE_REAL_COLLECTOR || process.env.VIRALLAB_ENABLE_REAL_COLLECTOR !== "true") {
      return {
        mode: "real",
        status: "failed",
        progress: 0,
        metadata: {
          provider: this.id,
          ready: false,
          reason: "collector-disabled",
        },
        errorMessage:
          "Real collector is disabled. Set VIRALLAB_ENABLE_REAL_COLLECTOR=true before trying the real mode.",
        samples: [],
      };
    }

    if (!options?.cookieBlob) {
      return {
        mode: "real",
        status: "failed",
        progress: 0,
        metadata: {
          provider: this.id,
          ready: false,
          reason: "missing-cookie",
        },
        errorMessage: "No Xiaohongshu cookie has been configured for the current account.",
        samples: [],
      };
    }

    try {
      return await this.runWorker({
        keyword: request.keyword,
        sortBy: request.sortBy,
        targetCount: request.targetCount,
        cookieBlob: options.cookieBlob,
      });
    } catch (error) {
      return {
        mode: "real",
        status: "failed",
        progress: 0,
        metadata: {
          provider: this.id,
          ready: false,
          reason: "worker-bridge-failed",
        },
        errorMessage: error instanceof Error ? error.message : "Unknown real collector worker error.",
        samples: [],
      };
    }
  }

  async verifyCookie(options?: CollectorContext): Promise<CollectorVerificationResult> {
    if (!process.env.VIRALLAB_ENABLE_REAL_COLLECTOR || process.env.VIRALLAB_ENABLE_REAL_COLLECTOR !== "true") {
      return {
        success: false,
        verified: false,
        metadata: {
          provider: this.id,
          ready: false,
          reason: "collector-disabled",
        },
        errorMessage: "Real collector is disabled. Set VIRALLAB_ENABLE_REAL_COLLECTOR=true before verifying cookies.",
      };
    }

    if (!options?.cookieBlob) {
      return {
        success: false,
        verified: false,
        metadata: {
          provider: this.id,
          ready: false,
          reason: "missing-cookie",
        },
        errorMessage: "No Xiaohongshu cookie has been configured for the current account.",
      };
    }

    try {
      const result = await this.runWorker({
        action: "verify",
        keyword: "AI教育",
        sortBy: "hot",
        targetCount: 5,
        cookieBlob: options.cookieBlob,
      });
      return {
        success: result.status === "completed",
        verified: result.status === "completed",
        metadata: result.metadata,
        errorMessage: result.errorMessage || null,
      };
    } catch (error) {
      return {
        success: false,
        verified: false,
        metadata: {
          provider: this.id,
          ready: false,
          reason: "worker-bridge-failed",
        },
        errorMessage: error instanceof Error ? error.message : "Unknown real collector worker error.",
      };
    }
  }

  async getReadiness(options?: CollectorContext): Promise<CollectorReadiness> {
    return {
      mode: "real",
      enabled: process.env.VIRALLAB_ENABLE_REAL_COLLECTOR === "true",
      hasCookie: Boolean(options?.cookieBlob),
      runner: "worker-bridge",
      provider: this.id,
    };
  }
}
