import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import { spawn } from "node:child_process";
import {
  CollectRequest,
  CollectorContext,
  CollectorProgressUpdate,
  CollectorReadiness,
  CollectorRunResult,
  CollectorVerificationResult,
  ViralLabCollectorProvider,
} from "./collector.types";

export class XiaohongshuCollector implements ViralLabCollectorProvider {
  readonly id = "xiaohongshu-playwright" as const;
  readonly mode = "real" as const;
  readonly platform = "xiaohongshu" as const;

  private getWorkerTimeoutMs() {
    const configured = Number(process.env.VIRALLAB_REAL_COLLECTOR_TIMEOUT_MS || 120000);
    return Number.isFinite(configured) && configured >= 30000 ? configured : 120000;
  }

  private async runWorker(payload: Record<string, unknown>, onProgress?: CollectorContext["onProgress"]) {
    const runnerPath = path.resolve(__dirname, "../../../worker/src/run-xiaohongshu-collector.js");
    const progressFilePath = path.join(
      os.tmpdir(),
      `virallab-progress-${Date.now()}-${Math.random().toString(16).slice(2)}.json`,
    );

    return await new Promise<CollectorRunResult>((resolve, reject) => {
      const child = spawn("node", [runnerPath, JSON.stringify({ ...payload, progressFilePath })], {
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      let settled = false;
      let lastProgressRaw = "";

      const timeout = setTimeout(() => {
        child.kill("SIGTERM");
      }, this.getWorkerTimeoutMs());

      const pollProgress = async () => {
        if (!onProgress) return;
        try {
          const raw = await fs.readFile(progressFilePath, "utf8");
          if (!raw || raw === lastProgressRaw) return;
          lastProgressRaw = raw;
          const parsed = JSON.parse(raw) as CollectorProgressUpdate;
          await onProgress(parsed);
        } catch {
          // ignore missing or partial progress writes
        }
      };

      const poller = setInterval(() => {
        void pollProgress();
      }, 1000);

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("error", async (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        clearInterval(poller);
        await fs.unlink(progressFilePath).catch(() => {});
        reject(error);
      });

      child.on("close", async (code, signal) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        clearInterval(poller);
        await pollProgress();
        await fs.unlink(progressFilePath).catch(() => {});
        if (signal === "SIGTERM") {
          reject(new Error(`Real collector timed out after ${Math.round(this.getWorkerTimeoutMs() / 1000)}s while waiting for Xiaohongshu.`));
          return;
        }
        if (code !== 0 && !stdout.trim()) {
          reject(new Error(stderr.trim() || `Worker exited with code ${code || 0}.`));
          return;
        }
        try {
          resolve(JSON.parse(stdout) as CollectorRunResult);
        } catch (error) {
          reject(new Error(stderr.trim() || (error instanceof Error ? error.message : "Unable to parse worker output.")));
        }
      });
    });
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
      return await this.runWorker(
        {
          keyword: request.keyword,
          sortBy: request.sortBy,
          noteType: request.noteType,
          publishWindow: request.publishWindow,
          targetCount: request.targetCount,
          manualSearchPageUrl: request.manualSearchPageUrl,
          manualSearchRequestData: request.manualSearchRequestData || null,
          cookieBlob: options.cookieBlob,
        },
        options?.onProgress,
      );
    } catch (error) {
      const timeoutMessage =
        error && typeof error === "object" && "signal" in error && error.signal === "SIGTERM"
          ? `Real collector timed out after ${Math.round(this.getWorkerTimeoutMs() / 1000)}s while waiting for Xiaohongshu.`
          : null;
      return {
        mode: "real",
        status: "failed",
        progress: 0,
        metadata: {
          provider: this.id,
          ready: false,
          reason: timeoutMessage ? "worker-bridge-timeout" : "worker-bridge-failed",
        },
        errorMessage:
          timeoutMessage || (error instanceof Error ? error.message : "Unknown real collector worker error."),
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
        noteType: "all",
        publishWindow: "all",
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
