import { Injectable } from "@nestjs/common";
import { ViralLabStoreService } from "../store/store.service";
import {
  ViralLabAdDetectorConfig,
  ViralLabAdDetectorRun,
  ViralLabAdLibraryItem,
  ViralLabSample,
} from "../store/types";
import { ViralLabLlmService } from "../llm/llm.service";
import {
  DEFAULT_AD_DETECTOR_SYSTEM_PROMPT,
  DEFAULT_AD_DETECTOR_SYSTEM_VERSION,
  DEFAULT_AD_DETECTOR_USER_PROMPT,
  DEFAULT_AD_DETECTOR_USER_VERSION,
} from "./ad-detector.defaults";

type AdDetectorDecision = {
  run: ViralLabAdDetectorRun;
  libraryItem: ViralLabAdLibraryItem | null;
};

const now = () => new Date().toISOString();

const normalizeNameList = (value: unknown) =>
  Array.isArray(value)
    ? value.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

@Injectable()
export class AdDetectorService {
  constructor(
    private readonly store: ViralLabStoreService,
    private readonly llm: ViralLabLlmService,
  ) {}

  async getConfig(userId = "user_demo") {
    const db = await this.store.read();
    const existing =
      db.adDetectorConfigs.find((item) => item.userId === userId) ||
      db.adDetectorConfigs[0] ||
      null;

    if (existing) {
      return existing;
    }

    const config = this.buildDefaultConfig(userId);
    await this.store.mutate((mutableDb) => {
      mutableDb.adDetectorConfigs.unshift(config);
      return null;
    });
    return config;
  }

  async updateConfig(
    userId: string,
    payload: Partial<Pick<ViralLabAdDetectorConfig, "enabled" | "threshold" | "systemPrompt" | "userPrompt">>,
  ) {
    const current = await this.getConfig(userId);
    const next: ViralLabAdDetectorConfig = {
      ...current,
      enabled: typeof payload.enabled === "boolean" ? payload.enabled : current.enabled,
      threshold:
        Number.isFinite(Number(payload.threshold)) && Number(payload.threshold) >= 0
          ? Math.max(0, Math.min(100, Number(payload.threshold)))
          : current.threshold,
      systemPrompt: payload.systemPrompt?.trim() || current.systemPrompt,
      userPrompt: payload.userPrompt?.trim() || current.userPrompt,
      updatedAt: now(),
    };

    await this.store.mutate((db) => {
      const index = db.adDetectorConfigs.findIndex((item) => item.id === next.id);
      if (index >= 0) {
        db.adDetectorConfigs[index] = next;
      } else {
        db.adDetectorConfigs.unshift(next);
      }
      return null;
    });

    return next;
  }

  async detectSample(userId: string, sample: ViralLabSample): Promise<AdDetectorDecision> {
    const config = await this.getConfig(userId);
    const timestamp = now();
    const fallback = this.buildFallbackDecision(sample, config, timestamp);

    if (!config.enabled) {
      return {
        run: {
          ...fallback.run,
          isAd: false,
          confidence: 0,
          commercialIntentScore: 0,
          adType: "detector-disabled",
          reasoning: "Ad detector disabled.",
          adSignals: [],
        },
        libraryItem: null,
      };
    }

    let decision = fallback;
    if (this.llm.isEnabled()) {
      try {
        const response = await this.llm.chatJson<{
          isAd?: boolean;
          confidence?: number;
          commercialIntentScore?: number;
          adType?: string;
          brandNames?: string[];
          productNames?: string[];
          institutionNames?: string[];
          serviceNames?: string[];
          adSignals?: string[];
          reasoning?: string;
        }>({
          messages: [
            { role: "system", content: config.systemPrompt },
            {
              role: "user",
              content: `${config.userPrompt}\n\n内容如下：\n${JSON.stringify(
                {
                  title: sample.title,
                  authorName: sample.authorName,
                  publishTime: sample.publishTime,
                  tags: sample.tags,
                  sourceUrl: sample.sourceUrl,
                  contentText: sample.contentText,
                  contentSummary: sample.contentSummary,
                  resolvedContentText: sample.resolvedContentText,
                  ocrTextClean: sample.ocrTextClean,
                  transcriptText: sample.transcriptText,
                  metrics: {
                    likeCount: sample.likeCount,
                    commentCount: sample.commentCount,
                    collectCount: sample.collectCount,
                    shareCount: sample.shareCount,
                  },
                },
                null,
                2,
              )}`,
            },
          ],
          temperature: 0.1,
          maxTokens: 1200,
          timeoutMs: 30000,
        });

        const confidence = this.normalizeScore(
          typeof response.commercialIntentScore === "number" ? response.commercialIntentScore : response.confidence,
        );
        const isAd = Boolean(response.isAd) || confidence >= config.threshold;
        const run: ViralLabAdDetectorRun = {
          id: this.store.createId("adrun"),
          userId,
          sampleId: sample.id,
          status: "completed",
          isAd,
          confidence: this.normalizeScore(response.confidence),
          commercialIntentScore: confidence,
          adType: String(response.adType || (isAd ? "commercial-promotion" : "non-ad")),
          reasoning: String(response.reasoning || (isAd ? "LLM determined the sample has commercial intent." : "LLM determined the sample is non-commercial.")),
          adSignals: normalizeNameList(response.adSignals),
          threshold: config.threshold,
          systemPromptVersion: DEFAULT_AD_DETECTOR_SYSTEM_VERSION,
          userPromptVersion: DEFAULT_AD_DETECTOR_USER_VERSION,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        const libraryItem = isAd
          ? this.buildLibraryItem(sample, run, {
              brandNames: normalizeNameList(response.brandNames),
              productNames: normalizeNameList(response.productNames),
              institutionNames: normalizeNameList(response.institutionNames),
              serviceNames: normalizeNameList(response.serviceNames),
            })
          : null;
        decision = { run, libraryItem };
      } catch (error) {
        decision = {
          run: {
            ...fallback.run,
            status: "failed",
            adType: "llm-error",
            reasoning: error instanceof Error ? error.message : "llm-error",
          },
          libraryItem: fallback.libraryItem,
        };
      }
    }

    await this.store.mutate((db) => {
      db.adDetectorRuns.unshift(decision.run);
      if (decision.libraryItem) {
        db.adLibraryItems.unshift(decision.libraryItem);
      }
      const sampleRef = db.samples.find((item) => item.id === sample.id);
      if (sampleRef) {
        sampleRef.adDecisionStatus = decision.run.isAd ? "rejected" : "accepted";
        sampleRef.adConfidence = decision.run.commercialIntentScore;
        sampleRef.adDetectorRunId = decision.run.id;
        sampleRef.updatedAt = timestamp;
      }
      return null;
    });

    return decision;
  }

  async listLibrary(userId = "user_demo") {
    const db = await this.store.read();
    return db.adLibraryItems
      .filter((item) => item.userId === userId)
      .slice()
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  async listRuns(userId = "user_demo") {
    const db = await this.store.read();
    return db.adDetectorRuns
      .filter((item) => item.userId === userId)
      .slice()
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  private buildDefaultConfig(userId: string): ViralLabAdDetectorConfig {
    const timestamp = now();
    return {
      id: this.store.createId("adcfg"),
      userId,
      enabled: true,
      threshold: 80,
      systemPrompt: DEFAULT_AD_DETECTOR_SYSTEM_PROMPT,
      userPrompt: DEFAULT_AD_DETECTOR_USER_PROMPT,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  private buildFallbackDecision(sample: ViralLabSample, config: ViralLabAdDetectorConfig, timestamp: string): AdDetectorDecision {
    const adSignals: string[] = [];
    const combinedText = [
      sample.title,
      sample.contentText,
      sample.contentSummary,
      sample.resolvedContentText,
      sample.ocrTextClean,
      sample.transcriptText,
      sample.tags.join(" "),
    ]
      .filter(Boolean)
      .join("\n");

    const signalPatterns = [
      { regex: /报名|下单|购买|领券|私信|咨询|点击主页|链接|课程|体验课/gi, label: "conversion-cta" },
      { regex: /品牌|官方|旗舰|报名入口|合作/gi, label: "brand-mention" },
      { regex: /推荐|种草|真香|必须入|购买清单/gi, label: "promotion-language" },
    ];

    let score = 0;
    for (const rule of signalPatterns) {
      if (rule.regex.test(combinedText)) {
        score += 35;
        adSignals.push(rule.label);
      }
    }

    const isAd = score >= config.threshold;
    const run: ViralLabAdDetectorRun = {
      id: this.store.createId("adrun"),
      userId: sample.userId,
      sampleId: sample.id,
      status: "completed",
      isAd,
      confidence: score,
      commercialIntentScore: score,
      adType: isAd ? "heuristic-commercial" : "non-ad",
      reasoning: isAd
        ? "Heuristic detector found strong commercial intent signals."
        : "Heuristic detector did not find enough commercial intent signals.",
      adSignals,
      threshold: config.threshold,
      systemPromptVersion: DEFAULT_AD_DETECTOR_SYSTEM_VERSION,
      userPromptVersion: DEFAULT_AD_DETECTOR_USER_VERSION,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    return {
      run,
      libraryItem: isAd ? this.buildLibraryItem(sample, run, {}) : null,
    };
  }

  private buildLibraryItem(
    sample: ViralLabSample,
    run: ViralLabAdDetectorRun,
    entities: {
      brandNames?: string[];
      productNames?: string[];
      institutionNames?: string[];
      serviceNames?: string[];
    },
  ): ViralLabAdLibraryItem {
    const timestamp = now();
    return {
      id: this.store.createId("adlib"),
      userId: sample.userId,
      sampleId: sample.id,
      detectorRunId: run.id,
      title: sample.title,
      authorName: sample.authorName,
      publishTime: sample.publishTime,
      sourceUrl: sample.sourceUrl,
      isAd: true,
      confidence: run.confidence,
      commercialIntentScore: run.commercialIntentScore,
      adType: run.adType,
      reasoning: run.reasoning,
      adSignals: run.adSignals,
      brandNames: entities.brandNames || [],
      productNames: entities.productNames || [],
      institutionNames: entities.institutionNames || [],
      serviceNames: entities.serviceNames || [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  private normalizeScore(value: unknown) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.min(100, Math.round(numeric)));
  }
}
