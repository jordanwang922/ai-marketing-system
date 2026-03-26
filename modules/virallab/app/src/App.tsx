import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatCard } from "./components/StatCard";

type Locale = "zh" | "en";

type OverviewStat = {
  label: string;
  value: string;
  note: string;
};

type Job = {
  id: string;
  keyword: string;
  status: string;
  progress: number;
  targetCount: number;
  sortBy: string;
  collectorMode: "mock" | "real";
  errorMessage?: string | null;
  metadata?: {
    provider?: string;
    providerMode?: string;
    reason?: string;
    rawItemCount?: number;
    normalizedItemCount?: number;
    fallbackItemCount?: number;
    fallbackUsed?: boolean;
    linksCaptured?: number;
    markdownCaptured?: boolean;
    htmlCaptured?: boolean;
    extractedCount?: number;
    extractedFrom?: string;
    diagnostics?: {
      title?: string;
      href?: string;
      bodyTextSample?: string;
    };
    artifacts?: {
      screenshotPath?: string;
      htmlPath?: string;
    };
    modalEnrichment?: {
      attempted?: boolean;
      modalOpenCount?: number;
      modalMissCount?: number;
      detailEnrichedCount?: number;
    };
  } | null;
};

type Sample = {
  id: string;
  keyword: string;
  title: string;
  provider: string;
  contentText: string;
  contentSummary: string;
  authorName: string;
  publishTime: string;
  likeCount: number;
  commentCount: number;
  collectCount: number;
  shareCount: number;
  tags: string[];
  sourceUrl: string;
  coverImageUrl: string;
  mediaImageUrls: string[];
  mediaVideoUrls: string[];
  qualityScore: number;
  qualityFlags: string[];
  collectorMode: "mock" | "real";
};

type Analysis = {
  id: string;
  sampleId: string;
  hookType: string;
  structureType: string;
  summary: string;
  modelName: string;
  promptVersion: string;
  fallbackStatus: "llm" | "local-fallback" | "local-only";
  fallbackReason?: string | null;
};

type Pattern = {
  id: string;
  name: string;
  topic: string;
  confidenceScore: number;
  sourceSampleIds: string[];
  description: string;
  modelName: string;
  promptVersion: string;
  fallbackStatus: "llm" | "local-fallback" | "local-only";
  fallbackReason?: string | null;
};

type GeneratedContent = {
  id: string;
  titleCandidates: string[];
  bodyText: string;
  coverCopy: string;
  tags: string[];
  generationNotes: string;
  modelName: string;
  promptVersion: string;
  fallbackStatus: "llm" | "local-fallback" | "local-only";
  fallbackReason?: string | null;
};

type User = {
  id: string;
  email: string;
  displayName: string;
};

type PlatformAccount = {
  id: string;
  accountName: string;
  cookieStatus: string;
  lastVerifiedAt: string | null;
  verificationMessage?: string | null;
  verificationMetadata?: {
    reason?: string;
    diagnostics?: {
      href?: string;
      title?: string;
      stateSummary?: {
        userLoggedIn?: boolean;
        searchKeyword?: string;
        currentSearchType?: string;
        searchFeedCount?: number;
        homeFeedCount?: number;
      };
      networkSummary?: {
        capturedResponses?: number;
        urls?: string[];
        authFailure?: {
          url?: string;
          code?: number | null;
          msg?: string | null;
        } | null;
      };
    };
    artifacts?: {
      screenshotPath?: string;
      htmlPath?: string;
    };
  } | null;
};

type CollectorCapabilities = {
  mock: { mode: "mock"; ready: boolean; description: string; provider?: string };
  real: {
    mode: "real";
    enabled: boolean;
    hasCookie: boolean;
    runner: string;
    description: string;
    provider?: string;
    cookieStatus?: string;
    lastVerifiedAt?: string | null;
    canCollect?: boolean;
    verificationRequired?: boolean;
    verificationMessage?: string | null;
  };
  managed: {
    mode: "real";
    enabled: boolean;
    hasCookie: boolean;
    runner: string;
    description: string;
    provider?: string;
  };
};

type DebugSummary = {
  platform: string;
  account: PlatformAccount | null;
  latestRealJob: Job | null;
};

type WorkflowResult = {
  success: boolean;
  message?: string;
  job?: Job | null;
  samples?: Array<{
    id: string;
    title: string;
    keyword: string;
    likeCount: number;
    qualityScore: number;
  }>;
  analyses?: Analysis[];
  pattern?: Pattern | null;
  generated?: GeneratedContent | null;
  diagnostics?: {
    averageSampleQuality: number | null;
    topSampleQuality: number | null;
    llmAnalysisCount: number;
    fallbackAnalysisCount: number;
    localAnalysisCount: number;
    patternSource: string | null;
    generationSource: string | null;
    patternConfidence: number | null;
    generatedTitleCount: number;
    generatedTagCount: number;
    workflowVerdict: "strong" | "usable" | "review";
    workflowSummary: string;
  };
  contentId?: string | null;
};

type WorkflowJob = {
  id: string;
  workflowType: "latest-real-pipeline";
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  targetJobId: string | null;
  errorMessage: string | null;
  finishedAt: string | null;
  metadata?: {
    stage?: string;
    providerId?: string | null;
    sampleLimit?: number;
    forceReanalyze?: boolean;
    goal?: string;
    tone?: string;
    targetAudience?: string;
    sourceJobId?: string;
    sampleIds?: string[];
    analysisIds?: string[];
    patternId?: string | null;
    contentId?: string | null;
    message?: string;
    workflowVerdict?: "strong" | "usable" | "review" | null;
    workflowSummary?: string | null;
    averageSampleQuality?: number | null;
    llmAnalysisCount?: number;
    fallbackAnalysisCount?: number;
    localAnalysisCount?: number;
    patternSource?: string | null;
    generationSource?: string | null;
    patternConfidence?: number | null;
  } | null;
};

const API_BASE = "http://localhost:3301/api/virallab";
const TOKEN_KEY = "virallab-token";
const LOCALE_KEY = "virallab-locale";

const formatAiSource = (item: {
  fallbackStatus?: "llm" | "local-fallback" | "local-only";
  modelName?: string;
}, locale: Locale) => {
  if (item.fallbackStatus === "llm") {
    return `LLM · ${item.modelName || (locale === "zh" ? "未知模型" : "unknown-model")}`;
  }
  if (item.fallbackStatus === "local-fallback") {
    return `${locale === "zh" ? "降级回退" : "Fallback"} · ${item.modelName || (locale === "zh" ? "本地" : "local")}`;
  }
  return `${locale === "zh" ? "本地" : "Local"} · ${item.modelName || "mvp-local"}`;
};

const formatStatus = (status: string | undefined, locale: Locale) => {
  const map: Record<string, { zh: string; en: string }> = {
    pending: { zh: "等待中", en: "Pending" },
    running: { zh: "运行中", en: "Running" },
    completed: { zh: "已完成", en: "Completed" },
    failed: { zh: "失败", en: "Failed" },
    blocked: { zh: "已阻断", en: "Blocked" },
    hot: { zh: "热门", en: "hot" },
    latest: { zh: "最新", en: "latest" },
    mock: { zh: "模拟", en: "mock" },
    real: { zh: "真实", en: "real" },
    verified: { zh: "已验证", en: "Verified" },
    invalid: { zh: "失效", en: "Invalid" },
    saved: { zh: "已保存", en: "Saved" },
  };

  if (!status) return "--";
  return map[status]?.[locale] || status;
};

const formatQualityFlag = (flag: string, locale: Locale) => {
  const map: Record<string, { zh: string; en: string }> = {
    missing_platform_content_id: { zh: "缺少内容ID", en: "missing content id" },
    missing_author_id: { zh: "缺少作者ID", en: "missing author id" },
    missing_media: { zh: "缺少媒体资源", en: "missing media" },
    weak_content_text: { zh: "正文偏弱", en: "weak content text" },
    weak_content_summary: { zh: "摘要偏弱", en: "weak content summary" },
    missing_cover: { zh: "缺少封面", en: "missing cover" },
    missing_publish_time: { zh: "缺少发布时间", en: "missing publish time" },
    missing_source_url: { zh: "缺少原文链接", en: "missing source url" },
    missing_tags: { zh: "缺少标签", en: "missing tags" },
  };

  return map[flag]?.[locale] || flag;
};

const formatWorkflowVerdict = (verdict: "strong" | "usable" | "review" | null | undefined, locale: Locale) => {
  const map = {
    strong: { zh: "优秀", en: "strong" },
    usable: { zh: "可用", en: "usable" },
    review: { zh: "待复核", en: "review" },
  };

  if (!verdict) return "--";
  return map[verdict][locale];
};

const formatOverviewLabel = (label: string, locale: Locale) => {
  const map: Record<string, { zh: string; en: string }> = {
    "Collection Jobs": { zh: "采集任务", en: "Collection Jobs" },
    Samples: { zh: "样本", en: "Samples" },
    Patterns: { zh: "Patterns", en: "Patterns" },
    "Generated Drafts": { zh: "生成草稿", en: "Generated Drafts" },
  };
  return map[label]?.[locale] || label;
};

const formatOverviewNote = (note: string, locale: Locale) => {
  const map: Record<string, { zh: string; en: string }> = {
    running: { zh: "运行中", en: "running" },
    xiaohongshu: { zh: "小红书", en: "xiaohongshu" },
    "pattern library": { zh: "模式库", en: "pattern library" },
    "mvp drafts": { zh: "MVP 草稿", en: "mvp drafts" },
  };
  return map[note]?.[locale] || note;
};

const translateKnownUiText = (value: string | null | undefined, locale: Locale) => {
  if (!value) return "--";
  const map: Record<string, { zh: string; en: string }> = {
    "Workflow completed.": { zh: "工作流已完成。", en: "Workflow completed." },
    "Pipeline needs review.": { zh: "这条流程需要复核。", en: "Pipeline needs review." },
    "Cookie verified successfully.": { zh: "Cookie 验证成功。", en: "Cookie verified successfully." },
    "Local MVP collector that generates simulated Xiaohongshu samples.": { zh: "本地 MVP 模拟采集器，用于生成小红书样本数据。", en: "Local MVP collector that generates simulated Xiaohongshu samples." },
    "Playwright-based Xiaohongshu collector bridge.": { zh: "基于 Playwright 的小红书采集桥接器。", en: "Playwright-based Xiaohongshu collector bridge." },
    "Reserved slot for future managed scraping integrations such as XCrawl-like providers.": { zh: "为 XCrawl 一类托管抓取方案预留的接入口。", en: "Reserved slot for future managed scraping integrations such as XCrawl-like providers." },
  };
  return map[value]?.[locale] || value;
};

export default function App() {
  const [locale, setLocale] = useState<Locale>(() => {
    const stored = localStorage.getItem(LOCALE_KEY);
    return stored === "en" ? "en" : "zh";
  });
  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({
    email: "demo@virallab.local",
    password: "demo123456",
    displayName: "Jordan",
  });
  const [authError, setAuthError] = useState("");
  const [stats, setStats] = useState<OverviewStat[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  const [platformAccounts, setPlatformAccounts] = useState<PlatformAccount[]>([]);
  const [capabilities, setCapabilities] = useState<CollectorCapabilities | null>(null);
  const [debugSummary, setDebugSummary] = useState<DebugSummary | null>(null);
  const [workflowResult, setWorkflowResult] = useState<WorkflowResult | null>(null);
  const [workflowJobs, setWorkflowJobs] = useState<WorkflowJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [workspaceMessage, setWorkspaceMessage] = useState("");
  const [collectForm, setCollectForm] = useState({
    keyword: "AI教育",
    sortBy: "hot",
    targetCount: 12,
    collectorMode: "mock" as "mock" | "real",
    providerId: "mock-local",
  });
  const [generateForm, setGenerateForm] = useState({
    patternId: "",
    topic: "AI教育内容选题",
    goal: "生成一篇适合教育博主发布的小红书图文",
    tone: "专业但通俗",
    targetAudience: "老师和家长",
  });
  const [workflowForm, setWorkflowForm] = useState({
    providerId: "xiaohongshu-playwright",
    sampleLimit: 5,
    forceReanalyze: true,
  });
  const [cookieForm, setCookieForm] = useState({
    accountName: "Jordan Xiaohongshu",
    cookieBlob: "",
  });
  const t = (zh: string, en: string) => (locale === "zh" ? zh : en);

  useEffect(() => {
    localStorage.setItem(LOCALE_KEY, locale);
  }, [locale]);

  const selectedSampleIds = useMemo(() => samples.slice(0, 5).map((item) => item.id), [samples]);
  const visibleSamples = useMemo(() => samples.slice(0, 10), [samples]);
  const selectedAnalysisIds = useMemo(() => analyses.slice(0, 4).map((item) => item.id), [analyses]);
  const providerSampleStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const sample of samples) {
      counts.set(sample.provider, (counts.get(sample.provider) || 0) + 1);
    }
    return Array.from(counts.entries());
  }, [samples]);
  const sampleQualityStats = useMemo(() => {
    if (!samples.length) return null;
    const flagCounts = new Map<string, number>();
    let totalScore = 0;
    let strongCount = 0;
    let weakCount = 0;

    for (const sample of samples) {
      totalScore += sample.qualityScore || 0;
      if ((sample.qualityScore || 0) >= 80) {
        strongCount += 1;
      }
      if ((sample.qualityScore || 0) < 60) {
        weakCount += 1;
      }
      for (const flag of sample.qualityFlags || []) {
        flagCounts.set(flag, (flagCounts.get(flag) || 0) + 1);
      }
    }

    const averageScore = Math.round(totalScore / samples.length);
    const topFlags = Array.from(flagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      averageScore,
      strongCount,
      weakCount,
      topFlags,
    };
  }, [samples]);
  const providerJobStats = useMemo(() => {
    const stats = new Map<
      string,
      {
        jobs: number;
        normalizedItemCount: number;
        fallbackItemCount: number;
        fallbackUsedCount: number;
      }
    >();

    for (const job of jobs) {
      const provider = job.metadata?.provider || "unknown";
      const current = stats.get(provider) || {
        jobs: 0,
        normalizedItemCount: 0,
        fallbackItemCount: 0,
        fallbackUsedCount: 0,
      };
      current.jobs += 1;
      current.normalizedItemCount += job.metadata?.normalizedItemCount || 0;
      current.fallbackItemCount += job.metadata?.fallbackItemCount || 0;
      current.fallbackUsedCount += job.metadata?.fallbackUsed ? 1 : 0;
      stats.set(provider, current);
    }

    return Array.from(stats.entries());
  }, [jobs]);
  const selectedCollectorCapability = useMemo(() => {
    if (!capabilities) return null;
    if (collectForm.providerId === "xiaohongshu-managed") return capabilities.managed;
    if (collectForm.collectorMode === "real") return capabilities.real;
    return capabilities.mock;
  }, [capabilities, collectForm.collectorMode, collectForm.providerId]);
  const selectedProviderEnabled = useMemo(() => {
    if (!selectedCollectorCapability) return false;
    if ("enabled" in selectedCollectorCapability) {
      return selectedCollectorCapability.enabled;
    }
    return selectedCollectorCapability.ready;
  }, [selectedCollectorCapability]);

  const apiFetch = async (path: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (!headers.has("Content-Type") && options.body) {
      headers.set("Content-Type", "application/json");
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Request failed: ${response.status}`);
    }
    return response.json();
  };

  const refreshAll = async () => {
    const [debugRes, meRes, overviewRes, jobsRes, workflowJobsRes, samplesRes, analysesRes, patternsRes, accountsRes, capabilitiesRes] = await Promise.all([
      apiFetch("/collect/debug-summary"),
      apiFetch("/auth/me"),
      apiFetch("/overview"),
      apiFetch("/collect/jobs"),
      apiFetch("/workflow/jobs"),
      apiFetch("/samples"),
      apiFetch("/analyze/results"),
      apiFetch("/patterns"),
      apiFetch("/platform-accounts"),
      apiFetch("/collect/capabilities"),
    ]);

    setDebugSummary((debugRes as { item?: DebugSummary }).item || null);
    setUser((meRes as { user?: User }).user || null);
    setStats((overviewRes as { stats?: OverviewStat[] }).stats || []);
    setJobs((jobsRes as { items?: Job[] }).items || []);
    setWorkflowJobs((workflowJobsRes as { items?: WorkflowJob[] }).items || []);
    setSamples((samplesRes as { items?: Sample[] }).items || []);
    setAnalyses((analysesRes as { items?: Analysis[] }).items || []);
    setPatterns((patternsRes as { items?: Pattern[] }).items || []);
    setPlatformAccounts((accountsRes as { items?: PlatformAccount[] }).items || []);
    setCapabilities((capabilitiesRes as { items?: CollectorCapabilities }).items || null);
    setGenerateForm((prev) => ({
      ...prev,
      patternId: prev.patternId || (patternsRes as { items?: Pattern[] }).items?.[0]?.id || "",
    }));
  };

  useEffect(() => {
    if (!token) return;
    void refreshAll().catch((error) => {
      setAuthError(error.message || t("恢复会话失败。", "Unable to restore session."));
      localStorage.removeItem(TOKEN_KEY);
      setToken("");
      setUser(null);
    });
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const hasActiveJob =
      jobs.some((job) => job.status === "pending" || job.status === "running") ||
      workflowJobs.some((job) => job.status === "pending" || job.status === "running");
    if (!hasActiveJob) return;

    const timer = window.setTimeout(() => {
      void refreshAll().catch((error) => {
        setWorkspaceMessage(error instanceof Error ? error.message : t("刷新采集任务失败。", "Unable to refresh collection jobs."));
      });
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [token, jobs, workflowJobs]);

  useEffect(() => {
    if (!token) return;
    const latestWorkflowJob = workflowJobs[0];
    if (!latestWorkflowJob || latestWorkflowJob.status !== "completed") return;

    void apiFetch(`/workflow/jobs/${latestWorkflowJob.id}`)
      .then((detail) => {
        const result = (detail as { result?: WorkflowResult | null }).result || null;
        setWorkflowResult(result);
        if (result?.generated) {
          setGenerated(result.generated);
        }
      })
      .catch(() => {
        // ignore detail refresh errors in the MVP shell
      });
  }, [token, workflowJobs]);

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");
    setLoading(true);
    try {
      if (authMode === "register") {
        await apiFetch("/auth/register", {
          method: "POST",
          body: JSON.stringify(authForm),
        });
      }
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authForm.email, password: authForm.password }),
      }).then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      });
      localStorage.setItem(TOKEN_KEY, response.token);
      setToken(response.token);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : t("登录失败。", "Authentication failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // ignore logout errors for local MVP
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setUser(null);
    setGenerated(null);
    setStats([]);
    setJobs([]);
    setWorkflowJobs([]);
    setSamples([]);
    setAnalyses([]);
    setPatterns([]);
  };

  const handleCreateJob = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await apiFetch("/collect/jobs", {
        method: "POST",
        body: JSON.stringify(collectForm),
      });
      setWorkspaceMessage(
        response?.status === "pending"
          ? t(`采集任务 ${response?.jobId || ""} 已入队，工作区会自动刷新。`, `Collection job ${response?.jobId || ""} queued. The workspace will refresh automatically.`)
          : response?.errorMessage
            ? t(`采集任务返回问题：${response.errorMessage}`, `Collection job finished with issue: ${response.errorMessage}`)
            : t(`采集任务 ${response?.jobId || ""} 已完成。`, `Collection job ${response?.jobId || ""} completed.`),
      );
      await refreshAll();
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : t("创建采集任务失败。", "Unable to create collection job."));
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      await apiFetch("/analyze/jobs", {
        method: "POST",
        body: JSON.stringify({ sampleIds: selectedSampleIds, forceReanalyze: true }),
      });
      setWorkspaceMessage(t(`已重新分析 ${selectedSampleIds.length} 条样本。`, `Re-analyzed ${selectedSampleIds.length} samples.`));
      await refreshAll();
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : t("分析样本失败。", "Unable to analyze samples."));
    } finally {
      setLoading(false);
    }
  };

  const handleExtractPattern = async () => {
    setLoading(true);
    try {
      await apiFetch("/patterns/extract", {
        method: "POST",
        body: JSON.stringify({ analysisIds: selectedAnalysisIds }),
      });
      setWorkspaceMessage(t(`已从 ${selectedAnalysisIds.length} 条分析中提炼模式。`, `Extracted pattern from ${selectedAnalysisIds.length} analyses.`));
      await refreshAll();
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : t("提炼 Pattern 失败。", "Unable to extract pattern."));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await apiFetch("/generate/jobs", {
        method: "POST",
        body: JSON.stringify(generateForm),
      });

      if (response?.contentId) {
        const detail = await apiFetch(`/generate/contents/${response.contentId}`);
        setGenerated(detail.item || null);
      }
      setWorkspaceMessage(t("已生成一篇新的小红书草稿。", "Generated a new Xiaohongshu draft."));
      await refreshAll();
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : t("生成草稿失败。", "Unable to generate draft."));
    } finally {
      setLoading(false);
    }
  };

  const handleRunLatestRealPipeline = async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/workflow/jobs", {
        method: "POST",
        body: JSON.stringify({
          providerId: workflowForm.providerId,
          sampleLimit: workflowForm.sampleLimit,
          forceReanalyze: workflowForm.forceReanalyze,
          goal: "生成一篇适合教育赛道发布的小红书图文草稿",
          tone: "专业但通俗",
          targetAudience: "老师、家长和教育赛道创作者",
        }),
      });

      if (response?.jobId) {
        const detail = await apiFetch(`/workflow/jobs/${response.jobId}`);
        setWorkflowResult((detail as { result?: WorkflowResult | null }).result || null);
      }
      setWorkspaceMessage(
        response?.status === "pending"
          ? t(`工作流任务 ${response?.jobId || ""} 已入队，工作区会自动刷新。`, `Workflow job ${response?.jobId || ""} queued. The workspace will refresh automatically.`)
          : response?.errorMessage || t("最近一次真实流程入队失败。", "Unable to queue the latest real pipeline."),
      );
      await refreshAll();
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : t("运行最近真实流程失败。", "Unable to run the latest real pipeline."));
    } finally {
      setLoading(false);
    }
  };

  const handleRerunLatestWorkflow = async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/workflow/jobs/rerun-latest", {
        method: "POST",
      });
      if (response?.jobId) {
        const detail = await apiFetch(`/workflow/jobs/${response.jobId}`);
        setWorkflowResult((detail as { result?: WorkflowResult | null }).result || null);
      }
      setWorkspaceMessage(
        response?.status === "pending"
          ? t(`工作流任务 ${response?.jobId || ""} 已按最近配置重新入队。`, `Workflow job ${response?.jobId || ""} re-queued from the latest workflow config.`)
          : response?.errorMessage || t("重跑最近工作流失败。", "Unable to rerun the latest workflow."),
      );
      await refreshAll();
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : t("重跑最近工作流失败。", "Unable to rerun the latest workflow."));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCookies = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      await apiFetch("/platform-accounts/xiaohongshu/cookies", {
        method: "POST",
        body: JSON.stringify(cookieForm),
      });
      setWorkspaceMessage(t("已为当前账号保存小红书 Cookie。", "Saved Xiaohongshu cookie for the current account."));
      await refreshAll();
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : t("保存 Cookie 失败。", "Unable to save cookie."));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCookie = async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/platform-accounts/xiaohongshu/verify", {
        method: "POST",
      });
      setWorkspaceMessage(
        response?.verified
          ? t("小红书 Cookie 验证成功。", "Xiaohongshu cookie verified successfully.")
          : t(`Cookie 验证失败：${response?.errorMessage || "未知原因"}`, `Cookie verification failed: ${response?.errorMessage || "unknown reason"}`),
      );
      await refreshAll();
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : t("验证 Cookie 失败。", "Unable to verify cookie."));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="lang-switch">
            <button className={locale === "zh" ? "active" : ""} onClick={() => setLocale("zh")} type="button">中文</button>
            <button className={locale === "en" ? "active" : ""} onClick={() => setLocale("en")} type="button">EN</button>
          </div>
          <div className="brand-mark">V</div>
          <h1>ViralLab</h1>
          <p>{t("登录后进入小红书采集与分析工作台。", "Sign in to access the Xiaohongshu collection workspace.")}</p>
          <form className="stack-form" onSubmit={handleAuth}>
            {authMode === "register" && (
              <label>
                {t("显示名称", "Display name")}
                <input
                  value={authForm.displayName}
                  onChange={(event) => setAuthForm((prev) => ({ ...prev, displayName: event.target.value }))}
                />
              </label>
            )}
            <label>
              {t("邮箱", "Email")}
              <input
                value={authForm.email}
                onChange={(event) => setAuthForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </label>
            <label>
              {t("密码", "Password")}
              <input
                type="password"
                value={authForm.password}
                onChange={(event) => setAuthForm((prev) => ({ ...prev, password: event.target.value }))}
              />
            </label>
            <button disabled={loading} type="submit">
              {loading ? t("处理中...", "Working...") : authMode === "login" ? t("登录", "Sign In") : t("创建账号", "Create Account")}
            </button>
          </form>
          <div className="auth-meta">
            <button className="link-button" onClick={() => setAuthMode((prev) => (prev === "login" ? "register" : "login"))}>
              {authMode === "login" ? t("还没有账号？", "Need a new account?") : t("返回登录", "Back to sign in")}
            </button>
            <span>{t("演示账号：demo@virallab.local / demo123456", "Demo: demo@virallab.local / demo123456")}</span>
          </div>
          {authError ? <p className="auth-error">{authError}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <header className="sidebar">
        <div className="topbar-brand">
          <div className="brand-mark">V</div>
          <div className="topbar-titleblock">
            <h1>ViralLab</h1>
            <p>{t("爆款内容智能引擎", "Hot content intelligence engine")}</p>
          </div>
        </div>
        <nav className="nav-list">
          <a href="#overview">{t("总览", "Overview")}</a>
          <a href="#collect">{t("采集", "Collection")}</a>
          <a href="#samples">{t("样本", "Samples")}</a>
          <a href="#analyze">{t("分析", "Analyze")}</a>
          <a href="#patterns">{t("模式库", "Patterns")}</a>
          <a href="#generate">{t("生成", "Generate")}</a>
        </nav>
        <div className="topbar-actions">
          {user ? <div className="user-badge">{user.displayName}</div> : null}
          <div className="lang-switch sidebar-lang-switch">
            <button className={locale === "zh" ? "active" : ""} onClick={() => setLocale("zh")} type="button">中文</button>
            <button className={locale === "en" ? "active" : ""} onClick={() => setLocale("en")} type="button">EN</button>
          </div>
          <button className="sidebar-logout" onClick={handleLogout}>{t("退出登录", "Log Out")}</button>
        </div>
      </header>

      <main className="content">
        <section className="hero-panel" id="overview">
          <div>
            <p className="eyebrow">{t("V1 控制台", "V1 Console")}</p>
            <h2>{t("打通从小红书采集到生成的完整闭环。", "Build the Xiaohongshu collection to generation loop.")}</h2>
            <p className="hero-copy">
              {t(
                "当前本地 MVP 已经能跑通整条工作流：创建小红书采集任务、生成样本、分析爆款因子、提炼可复用 Pattern，并输出新的草稿。数据由 API 本地持久化，方便端到端联调和审阅。",
                "The local MVP already runs a full simulated workflow: create a Xiaohongshu collection job, generate sample content, analyze viral factors, extract a reusable pattern, and output a new draft. Data is persisted locally by the API so the module can be reviewed end to end.",
              )}
            </p>
          </div>
          <div className="hero-actions">
            <button onClick={() => void refreshAll()}>{t("刷新工作区", "Refresh Workspace")}</button>
            <button className="secondary" onClick={handleAnalyze}>{t("分析最新样本", "Analyze Latest Samples")}</button>
            <button
              className="secondary"
              disabled={loading || !debugSummary?.latestRealJob || debugSummary.latestRealJob.status !== "completed"}
              onClick={handleRunLatestRealPipeline}
            >
              {t("运行最近真实流程", "Run Latest Real Pipeline")}
            </button>
          </div>
        </section>

        {workspaceMessage ? <section className="panel compact-panel"><p className="hero-copy">{workspaceMessage}</p></section> : null}
        {workflowJobs[0] ? (
          <section className="panel compact-panel">
            <div className="panel-head">
              <h3>{t("工作流任务", "Workflow Jobs")}</h3>
              <span className="pill">{formatStatus(workflowJobs[0].status, locale)}</span>
            </div>
            {workflowJobs[0].metadata?.workflowVerdict ? (
              <div className="audit-meta">
                <span className={`quality-pill ${workflowJobs[0].metadata.workflowVerdict === "strong" ? "good" : workflowJobs[0].metadata.workflowVerdict === "usable" ? "medium" : "weak"}`}>
                  {formatWorkflowVerdict(workflowJobs[0].metadata.workflowVerdict, locale)}
                </span>
                <span>{translateKnownUiText(workflowJobs[0].metadata.workflowSummary, locale)}</span>
              </div>
            ) : null}
            {workflowJobs[0].metadata?.workflowVerdict ? (
              <div className="pattern-meta">
                <span>{t("平均质量", "avg quality")} {workflowJobs[0].metadata.averageSampleQuality ?? "--"}/100</span>
                <span>{workflowJobs[0].metadata.llmAnalysisCount ?? 0} {t("条 LLM 分析", "LLM analyses")}</span>
              </div>
            ) : null}
            <div className="pattern-meta">
              <span>{workflowJobs[0].id}</span>
              <span>{translateKnownUiText(workflowJobs[0].metadata?.message, locale)}</span>
            </div>
            {workflowJobs[0].metadata?.workflowVerdict ? (
              <div className="pattern-meta">
                <span>{t("Pattern 来源", "pattern")} {workflowJobs[0].metadata.patternSource || "--"}</span>
                <span>{t("生成来源", "generate")} {workflowJobs[0].metadata.generationSource || "--"}</span>
              </div>
            ) : null}
            <div className="pattern-meta">
              <span>{t("进度", "progress")} {workflowJobs[0].progress}%</span>
              <span>{workflowJobs[0].metadata?.providerId || workflowJobs[0].metadata?.stage || workflowJobs[0].targetJobId || "--"}</span>
            </div>
            {workflowJobs[0].metadata?.patternId || workflowJobs[0].metadata?.contentId ? (
              <div className="pattern-meta">
                <span>{workflowJobs[0].metadata?.patternId || "--"}</span>
                <span>{workflowJobs[0].metadata?.contentId || "--"}</span>
              </div>
            ) : null}
            {workflowJobs[0].errorMessage ? <span className="status-note">{workflowJobs[0].errorMessage}</span> : null}
            <div className="action-row">
              <button
                className="secondary-btn"
                disabled={loading}
                onClick={handleRerunLatestWorkflow}
                type="button"
              >
                {t("重跑最近工作流", "Re-run Latest Workflow")}
              </button>
            </div>
          </section>
        ) : null}
        <section className="panel compact-panel">
          <div className="panel-head">
            <h3>{t("工作流范围", "Workflow Scope")}</h3>
            <span className="pill">{t("来源过滤", "Provider Filter")}</span>
          </div>
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              void handleRunLatestRealPipeline();
            }}
          >
            <select
              value={workflowForm.providerId}
              onChange={(event) => setWorkflowForm((prev) => ({ ...prev, providerId: event.target.value }))}
            >
              <option value="xiaohongshu-playwright">xiaohongshu-playwright</option>
              <option value="xiaohongshu-managed">xiaohongshu-managed</option>
            </select>
            <input
              type="number"
              min={1}
              max={12}
              value={workflowForm.sampleLimit}
              onChange={(event) =>
                setWorkflowForm((prev) => ({ ...prev, sampleLimit: Number(event.target.value || 5) }))
              }
            />
            <select
              value={workflowForm.forceReanalyze ? "force" : "reuse"}
              onChange={(event) =>
                setWorkflowForm((prev) => ({ ...prev, forceReanalyze: event.target.value === "force" }))
              }
            >
              <option value="force">{t("强制重新分析", "force reanalyze")}</option>
              <option value="reuse">{t("复用分析结果", "reuse analyses")}</option>
            </select>
            <button
              type="submit"
              disabled={
                loading ||
                (workflowForm.providerId === "xiaohongshu-playwright"
                  ? !debugSummary?.latestRealJob || debugSummary.latestRealJob.status !== "completed"
                  : capabilities?.managed.enabled === false)
              }
            >
              {t("运行指定来源流程", "Run Provider Pipeline")}
            </button>
          </form>
          <p className="hint-text">
            {t("将流程限制到单一真实采集来源，便于分别评估 Playwright 与 managed 样本。", "Scope the pipeline to a single real collector provider so Playwright and managed samples can be evaluated separately.")}
          </p>
        </section>
        {workflowResult ? (
          <section className="panel compact-panel">
            <div className="panel-head">
              <h3>{t("最近一次真实工作流", "Latest Real Workflow")}</h3>
              <span className="pill">{workflowResult.success ? t("已完成", "Completed") : t("已阻断", "Blocked")}</span>
            </div>
            {workflowResult.diagnostics ? (
              <div className="audit-meta">
                <span className={`quality-pill ${workflowResult.diagnostics.workflowVerdict === "strong" ? "good" : workflowResult.diagnostics.workflowVerdict === "usable" ? "medium" : "weak"}`}>
                  {formatWorkflowVerdict(workflowResult.diagnostics.workflowVerdict, locale)}
                </span>
                <span>{translateKnownUiText(workflowResult.diagnostics.workflowSummary, locale)}</span>
              </div>
            ) : null}
            <div className="pattern-meta">
              <span>{workflowResult.job?.id || "--"}</span>
              <span>{workflowResult.pattern?.name || workflowResult.message || t("尚未生成 Pattern", "No pattern generated")}</span>
            </div>
            <div className="pattern-meta">
              <span>{workflowResult.samples?.length || 0} {t("条样本", "samples")}</span>
              <span>{workflowResult.analyses?.length || 0} {t("条分析", "analyses")}</span>
            </div>
            {workflowResult.diagnostics ? (
              <div className="pattern-meta">
                <span>{t("平均质量", "avg quality")} {workflowResult.diagnostics.averageSampleQuality ?? "--"}/100</span>
                <span>
                  {t("最高样本", "top sample")} {workflowResult.diagnostics.topSampleQuality ?? "--"}/100
                </span>
              </div>
            ) : null}
            {workflowResult.samples?.length ? (
              <div className="draft-tags quality-flags">
                {workflowResult.samples.slice(0, 5).map((sample) => (
                  <span key={sample.id}>
                    {sample.qualityScore}/100 · {sample.title}
                  </span>
                ))}
              </div>
            ) : null}
            {workflowResult.diagnostics ? (
              <div className="table-list">
                <div className="sample-card">
                  <strong>{t("流程诊断", "Pipeline Diagnostics")}</strong>
                  <div className="pattern-meta">
                    <span>{workflowResult.diagnostics.llmAnalysisCount} {t("条 LLM 分析", "LLM analyses")}</span>
                    <span>{workflowResult.diagnostics.fallbackAnalysisCount} {t("条降级分析", "fallback analyses")}</span>
                  </div>
                  <div className="pattern-meta">
                    <span>{workflowResult.diagnostics.localAnalysisCount} {t("条本地分析", "local analyses")}</span>
                    <span>{t("Pattern 置信度", "pattern confidence")} {workflowResult.diagnostics.patternConfidence ?? "--"}</span>
                  </div>
                  <div className="pattern-meta">
                    <span>{t("Pattern 来源", "pattern")} {workflowResult.diagnostics.patternSource || "--"}</span>
                    <span>{t("生成来源", "generate")} {workflowResult.diagnostics.generationSource || "--"}</span>
                  </div>
                  <div className="pattern-meta">
                    <span>{workflowResult.diagnostics.generatedTitleCount} {t("个标题", "titles")}</span>
                    <span>{workflowResult.diagnostics.generatedTagCount} {t("个标签", "tags")}</span>
                  </div>
                  {workflowResult.analyses?.length ? (
                    <div className="audit-meta">
                      <a className="sample-link" href="#samples">{t("打开样本", "open samples")}</a>
                      <a className="sample-link" href="#analyze">{t("打开分析", "open analyses")}</a>
                      <span>{workflowResult.analyses.length} {t("条工作流分析已关联", "workflow analyses linked")}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
            {workflowResult.pattern || workflowResult.generated ? (
              <div className="table-list">
                {workflowResult.pattern ? (
                  <div className="sample-card">
                    <strong>{t("Pattern 快照", "Pattern Snapshot")}</strong>
                    <div className="audit-meta">
                      <span className={`audit-pill ${workflowResult.pattern.fallbackStatus}`}>{formatAiSource(workflowResult.pattern, locale)}</span>
                      <span>{t("置信度", "confidence")} {workflowResult.pattern.confidenceScore}</span>
                      <a className="sample-link" href="#patterns">{t("打开模式库", "open pattern library")}</a>
                    </div>
                    <div className="pattern-meta">
                      <span>{workflowResult.pattern.topic}</span>
                      <span>{workflowResult.pattern.sourceSampleIds.length} {t("条来源样本", "source samples")}</span>
                    </div>
                    <p className="sample-summary">{workflowResult.pattern.description}</p>
                  </div>
                ) : null}
                {workflowResult.generated ? (
                  <div className="sample-card">
                    <strong>{t("生成快照", "Generation Snapshot")}</strong>
                    <div className="audit-meta">
                      <span className={`audit-pill ${workflowResult.generated.fallbackStatus}`}>{formatAiSource(workflowResult.generated, locale)}</span>
                      <span>{workflowResult.generated.titleCandidates.length} {t("个标题候选", "title candidates")}</span>
                      <a className="sample-link" href="#generated">{t("打开最新草稿", "open latest draft")}</a>
                    </div>
                    {workflowResult.generated.titleCandidates.length ? (
                      <div className="draft-tags quality-flags">
                        {workflowResult.generated.titleCandidates.slice(0, 3).map((title) => (
                          <span key={title}>{title}</span>
                        ))}
                      </div>
                    ) : null}
                    {workflowResult.generated.tags.length ? (
                      <div className="draft-tags quality-flags">
                        {workflowResult.generated.tags.slice(0, 6).map((tag) => (
                          <span key={tag}>#{tag}</span>
                        ))}
                      </div>
                    ) : null}
                    <p className="sample-summary">{workflowResult.generated.coverCopy || workflowResult.generated.generationNotes}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
            {workflowResult.generated?.titleCandidates?.[0] ? (
              <span className="status-note">{workflowResult.generated.titleCandidates[0]}</span>
            ) : null}
          </section>
        ) : null}

        <section className="stats-grid">
          {stats.map((item) => (
            <StatCard
              key={item.label}
              label={formatOverviewLabel(item.label, locale)}
              value={item.value}
              note={formatOverviewNote(item.note, locale)}
            />
          ))}
        </section>
        {providerSampleStats.length ? (
          <section className="panel compact-panel">
            <div className="panel-head">
              <h3>{t("样本来源", "Sample Sources")}</h3>
              <span className="pill">{t("来源", "Providers")}</span>
            </div>
            <div className="draft-tags">
              {providerSampleStats.map(([provider, count]) => (
                <span key={provider}>{provider} · {count}</span>
              ))}
            </div>
          </section>
        ) : null}
        {sampleQualityStats ? (
          <section className="panel compact-panel">
            <div className="panel-head">
              <h3>{t("样本质量", "Sample Quality")}</h3>
              <span className="pill">{t("自研通道", "Self-Hosted")}</span>
            </div>
            <div className="table-list">
              <div className="sample-card">
                <strong>{t("质量概览", "Quality Overview")}</strong>
                <div className="pattern-meta">
                  <span>{sampleQualityStats.averageScore}/100 {t("平均分", "average")}</span>
                  <span>{sampleQualityStats.strongCount} {t("优质", "strong")}</span>
                </div>
                <div className="pattern-meta">
                  <span>{sampleQualityStats.weakCount} {t("弱样本", "weak")}</span>
                  <span>{samples.length} {t("总样本", "total samples")}</span>
                </div>
                {sampleQualityStats.topFlags.length ? (
                  <div className="draft-tags quality-flags">
                    {sampleQualityStats.topFlags.map(([flag, count]) => (
                      <span key={flag}>{formatQualityFlag(flag, locale)} · {count}</span>
                    ))}
                  </div>
                ) : (
                  <span className="status-note">{t("当前样本未发现明显质量缺口。", "No quality gaps detected on current samples.")}</span>
                )}
              </div>
            </div>
          </section>
        ) : null}
        {providerJobStats.length ? (
          <section className="panel compact-panel">
            <div className="panel-head">
              <h3>{t("来源诊断", "Provider Diagnostics")}</h3>
              <span className="pill">{t("任务", "Jobs")}</span>
            </div>
            <div className="table-list">
              {providerJobStats.map(([provider, stat]) => (
                <div className="sample-card" key={provider}>
                  <strong>{provider}</strong>
                  <div className="pattern-meta">
                    <span>{stat.jobs} {t("个任务", "jobs")}</span>
                    <span>{stat.normalizedItemCount} {t("条标准化结果", "normalized")}</span>
                  </div>
                  <div className="pattern-meta">
                    <span>{stat.fallbackItemCount} {t("条回退结果", "fallback items")}</span>
                    <span>{stat.fallbackUsedCount} {t("次回退执行", "fallback runs")}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="panel-grid panel-grid-bottom">
          <article className="panel panel-wide">
            <div className="panel-head">
              <h3>{t("采集器就绪状态", "Collector Readiness")}</h3>
              <span className="pill">{t("平台接入", "Platform Access")}</span>
            </div>
            <div className="collector-status-grid">
              <div className="sample-card">
                <strong>{t("模拟采集器", "Mock Collector")}</strong>
                <span>{translateKnownUiText(capabilities?.mock.description, locale)}</span>
                <div className="pattern-meta">
                  <span>{capabilities?.mock.ready ? t("已就绪", "ready") : t("未就绪", "not ready")}</span>
                  <span>{capabilities?.mock.provider || "mock-local"}</span>
                </div>
              </div>
              <div className="sample-card">
                <strong>{t("真实采集器", "Real Collector")}</strong>
                <span>{translateKnownUiText(capabilities?.real.description, locale)}</span>
                <div className="pattern-meta">
                  <span>{capabilities?.real.enabled ? t("已启用", "enabled") : t("未启用", "disabled")}</span>
                  <span>{capabilities?.real.hasCookie ? `${t("Cookie", "cookie")} ${formatStatus(capabilities?.real.cookieStatus || "saved", locale)}` : t("缺少 Cookie", "cookie missing")}</span>
                </div>
                {capabilities?.real.verificationMessage ? (
                  <span className="status-note">{capabilities.real.verificationMessage}</span>
                ) : null}
              </div>
              <div className="sample-card">
                <strong>{t("托管采集器", "Managed Collector")}</strong>
                <span>{translateKnownUiText(capabilities?.managed.description, locale)}</span>
                <div className="pattern-meta">
                  <span>{capabilities?.managed.enabled ? t("已启用", "enabled") : t("未启用", "disabled")}</span>
                  <span>{capabilities?.managed.provider || "xiaohongshu-managed"}</span>
                </div>
                <span className="status-note">{t("预留给 XCrawl 一类托管抓取来源。", "Reserved slot for XCrawl-like managed providers.")}</span>
              </div>
            </div>
            <form className="stack-form" onSubmit={handleSaveCookies}>
              <label>
                {t("账号名称", "Account name")}
                <input
                  value={cookieForm.accountName}
                  onChange={(event) => setCookieForm((prev) => ({ ...prev, accountName: event.target.value }))}
                />
              </label>
              <label>
                {t("小红书 Cookie 内容", "Xiaohongshu cookie blob")}
                <textarea
                  rows={4}
                  placeholder={t("粘贴导出的 Cookie 字符串或 JSON", "Paste exported cookie string or JSON here")}
                  value={cookieForm.cookieBlob}
                  onChange={(event) => setCookieForm((prev) => ({ ...prev, cookieBlob: event.target.value }))}
                />
              </label>
              <button disabled={loading} type="submit">{t("保存采集 Cookie", "Save Collector Cookie")}</button>
            </form>
            <div className="action-row">
              <button
                className="secondary-btn"
                disabled={loading || platformAccounts.length === 0}
                onClick={handleVerifyCookie}
                type="button"
              >
                {t("验证 Cookie", "Verify Cookie")}
              </button>
            </div>
            <div className="table-list">
              {platformAccounts.map((account) => (
                <div className="table-row platform-row" key={account.id}>
                  <div>
                    <strong>{account.accountName}</strong>
                    <span>{account.id}</span>
                  </div>
                  <div>
                    <strong>xiaohongshu</strong>
                    <span>{formatStatus(account.cookieStatus, locale)}</span>
                  </div>
                  <div>
                    <strong>{account.lastVerifiedAt || "--"}</strong>
                    <span>{t("最近验证", "last verified")}</span>
                  </div>
                  <div>
                    <strong>{translateKnownUiText(account.verificationMessage, locale)}</strong>
                    <span>{t("验证说明", "verification note")}</span>
                  </div>
                  <div className="platform-debug">
                    <strong>{account.verificationMetadata?.reason || "--"}</strong>
                    <span>{t("原因", "reason")}</span>
                    {account.verificationMetadata?.diagnostics?.stateSummary ? (
                      <span>
                        {t("搜索流", "state feeds")}: {account.verificationMetadata.diagnostics.stateSummary.searchFeedCount || 0}
                        {" · "}
                        {t("首页流", "home feeds")}: {account.verificationMetadata.diagnostics.stateSummary.homeFeedCount || 0}
                      </span>
                    ) : null}
                    {account.verificationMetadata?.artifacts?.htmlPath ? (
                      <span>{account.verificationMetadata.artifacts.htmlPath}</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </article>
          <article className="panel">
            <div className="panel-head">
              <h3>{t("采集调试", "Collector Debug")}</h3>
              <span className="pill">{t("诊断", "Diagnostics")}</span>
            </div>
            {debugSummary?.account ? (
              <div className="debug-card">
                <strong>{formatStatus(debugSummary.account.cookieStatus, locale)}</strong>
                <span>{translateKnownUiText(debugSummary.account.verificationMessage, locale) || t("暂无验证信息。", "No verification message yet.")}</span>
                <div className="debug-grid">
                  <span>{t("原因", "reason")}: {debugSummary.account.verificationMetadata?.reason || "--"}</span>
                  <span>
                    {t("搜索流", "state feeds")}: {debugSummary.account.verificationMetadata?.diagnostics?.stateSummary?.searchFeedCount || 0}
                  </span>
                  <span>
                    {t("首页流", "home feeds")}: {debugSummary.account.verificationMetadata?.diagnostics?.stateSummary?.homeFeedCount || 0}
                  </span>
                  <span>
                    {t("网络响应", "network responses")}: {debugSummary.account.verificationMetadata?.diagnostics?.networkSummary?.capturedResponses || 0}
                  </span>
                  {debugSummary.account.verificationMetadata?.diagnostics?.networkSummary?.authFailure ? (
                    <span>
                      api auth failure: {debugSummary.account.verificationMetadata.diagnostics.networkSummary.authFailure.code ?? "--"}
                      {" · "}
                      {debugSummary.account.verificationMetadata.diagnostics.networkSummary.authFailure.msg || "--"}
                    </span>
                  ) : null}
                  <span>
                    {t("最近任务", "last job")}: {formatStatus(debugSummary.latestRealJob?.status || "", locale) || t("暂无真实任务", "no real job yet")}
                  </span>
                </div>
                {debugSummary.account.verificationMetadata?.diagnostics?.networkSummary?.urls?.[0] ? (
                  <span>{debugSummary.account.verificationMetadata.diagnostics.networkSummary.urls[0]}</span>
                ) : null}
                {debugSummary.account.verificationMetadata?.artifacts?.screenshotPath ? (
                  <span>{debugSummary.account.verificationMetadata.artifacts.screenshotPath}</span>
                ) : null}
                {debugSummary.account.verificationMetadata?.artifacts?.htmlPath ? (
                  <span>{debugSummary.account.verificationMetadata.artifacts.htmlPath}</span>
                ) : null}
                {debugSummary.latestRealJob?.metadata?.artifacts?.htmlPath ? (
                  <span>{t("任务 HTML", "job html")}: {debugSummary.latestRealJob.metadata.artifacts.htmlPath}</span>
                ) : null}
              </div>
            ) : (
              <p className="empty-state">{t("先保存小红书 Cookie，才能看到调试数据。", "Save a Xiaohongshu cookie to unlock debug data.")}</p>
            )}
          </article>
        </section>

        <section className="panel-grid">
          <article className="panel" id="collect">
            <div className="panel-head">
              <h3>{t("采集任务", "Collection Jobs")}</h3>
              <span className="pill">{t("采集器", "Collector")}</span>
            </div>
            <form className="inline-form" onSubmit={handleCreateJob}>
              <input
                value={collectForm.keyword}
                onChange={(event) => setCollectForm((prev) => ({ ...prev, keyword: event.target.value }))}
                placeholder={t("关键词", "Keyword")}
              />
              <select
                value={collectForm.sortBy}
                onChange={(event) => setCollectForm((prev) => ({ ...prev, sortBy: event.target.value }))}
              >
                <option value="hot">{t("热门", "hot")}</option>
                <option value="latest">{t("最新", "latest")}</option>
              </select>
              <select
                value={collectForm.collectorMode}
                onChange={(event) => {
                  const collectorMode = event.target.value as "mock" | "real";
                  setCollectForm((prev) => ({
                    ...prev,
                    collectorMode,
                    providerId: collectorMode === "real" ? "xiaohongshu-playwright" : "mock-local",
                  }));
                }}
              >
                <option value="mock">{t("模拟", "mock")}</option>
                <option value="real">{t("真实采集", "real collector")}</option>
              </select>
              <select
                value={collectForm.providerId}
                onChange={(event) => setCollectForm((prev) => ({ ...prev, providerId: event.target.value }))}
              >
                {collectForm.collectorMode === "mock" ? (
                  <option value="mock-local">mock-local</option>
                ) : (
                  <>
                    <option value="xiaohongshu-playwright">xiaohongshu-playwright</option>
                    <option value="xiaohongshu-managed">xiaohongshu-managed</option>
                  </>
                )}
              </select>
              <input
                type="number"
                min={5}
                max={50}
                value={collectForm.targetCount}
                onChange={(event) =>
                  setCollectForm((prev) => ({ ...prev, targetCount: Number(event.target.value || 10) }))
                }
              />
              <button
                disabled={
                  loading ||
                  (collectForm.collectorMode === "real" &&
                    (collectForm.providerId === "xiaohongshu-playwright"
                      ? capabilities?.real.canCollect === false
                      : selectedProviderEnabled === false))
                }
                type="submit"
              >
                {loading ? t("运行中...", "Running...") : t("创建任务", "Create Job")}
              </button>
            </form>
            {collectForm.collectorMode === "real" && collectForm.providerId === "xiaohongshu-playwright" && capabilities?.real.canCollect === false ? (
              <p className="hint-text">
                {capabilities.real.verificationMessage || t("请先验证可用的小红书 Cookie，再运行真实采集。", "Verify a working Xiaohongshu cookie before running real collection.")}
              </p>
            ) : collectForm.collectorMode === "real" && collectForm.providerId === "xiaohongshu-playwright" && capabilities?.real.verificationRequired ? (
              <p className="hint-text">{t("启动真实采集任务时会自动验证当前已保存的 Cookie。", "The saved cookie will be auto-verified when you start a real collection job.")}</p>
            ) : collectForm.collectorMode === "real" && collectForm.providerId === "xiaohongshu-managed" ? (
              <p className="hint-text">{t("托管 provider 的 UI 已接好，但后端仍然是预留位。", "Managed provider slot is wired in the UI, but the backend integration is still a stub.")}</p>
            ) : null}
            <div className="table-list">
              {jobs.map((job) => (
                <div className="table-row" key={job.id}>
                  <div>
                    <strong>{job.keyword}</strong>
                    <span>{job.id}</span>
                  </div>
                  <div>
                    <strong>{job.targetCount} {t("条样本", "samples")}</strong>
                    <span>{formatStatus(job.sortBy, locale)} · {formatStatus(job.collectorMode, locale)} · {job.metadata?.provider || "--"}</span>
                  </div>
                  <div>
                    <strong>{job.progress}%</strong>
                    <span>{formatStatus(job.status, locale)}</span>
                    {job.status === "pending" || job.status === "running" ? (
                      <span>{t("后台处理中", "processing in background")}</span>
                    ) : null}
                    {job.errorMessage ? (
                      <span>
                        {job.errorMessage}
                        {job.metadata?.reason ? ` · ${job.metadata.reason}` : ""}
                        {job.metadata?.artifacts?.screenshotPath ? ` · screenshot: ${job.metadata.artifacts.screenshotPath}` : ""}
                      </span>
                    ) : job.metadata?.extractedCount ? (
                      <span>
                        {t("已提取", "extracted")} {job.metadata.extractedCount} {t("条，来源", "via")} {job.metadata.extractedFrom || t("未知", "unknown")}
                      </span>
                    ) : null}
                    {typeof job.metadata?.normalizedItemCount === "number" || typeof job.metadata?.fallbackItemCount === "number" ? (
                      <span>
                        {t("标准化", "normalized")} {job.metadata?.normalizedItemCount || 0}
                        {" · "}
                        {t("回退", "fallback")} {job.metadata?.fallbackItemCount || 0}
                        {job.metadata?.fallbackUsed ? ` · ${t("已使用回退", "fallback used")}` : ""}
                      </span>
                    ) : null}
                    {typeof job.metadata?.linksCaptured === "number" || job.metadata?.markdownCaptured || job.metadata?.htmlCaptured ? (
                      <span>
                        {t("链接", "links")} {job.metadata?.linksCaptured || 0}
                        {" · "}
                        markdown {job.metadata?.markdownCaptured ? t("是", "yes") : t("否", "no")}
                        {" · "}
                        html {job.metadata?.htmlCaptured ? t("是", "yes") : t("否", "no")}
                      </span>
                    ) : null}
                    {job.metadata?.modalEnrichment?.attempted ? (
                      <span>
                        {t("弹层打开", "modal opens")} {job.metadata.modalEnrichment.modalOpenCount || 0}
                        {" · "}
                        {t("弹层补全", "modal enriched")} {job.metadata.modalEnrichment.detailEnrichedCount || 0}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel" id="samples">
            <div className="panel-head">
              <h3>{t("样本", "Samples")}</h3>
              <span className="pill">{t("最新 10 条", "Latest 10")}</span>
            </div>
            <div className="table-list">
              {visibleSamples.map((sample) => (
                <div
                  className={`sample-card ${workflowResult?.samples?.some((item) => item.id === sample.id) ? "result-highlight" : ""}`}
                  key={sample.id}
                >
                  <div className="sample-card-top">
                    <div>
                      <strong>{sample.title}</strong>
                      <span>{sample.keyword}</span>
                    </div>
                    {sample.coverImageUrl ? (
                      <img className="sample-cover" src={sample.coverImageUrl} alt={sample.title} />
                    ) : null}
                  </div>
                  <div className="audit-meta">
                    <span className={`quality-pill ${sample.qualityScore >= 80 ? "good" : sample.qualityScore >= 60 ? "medium" : "weak"}`}>
                      {t("质量", "Quality")} {sample.qualityScore}/100
                    </span>
                    {workflowResult?.samples?.some((item) => item.id === sample.id) ? (
                      <span className="result-badge">{t("最近工作流", "latest workflow")}</span>
                    ) : null}
                    {sample.qualityFlags.length ? (
                      <span>{sample.qualityFlags.slice(0, 3).map((flag) => formatQualityFlag(flag, locale)).join(" · ")}</span>
                    ) : (
                      <span>{t("结构化样本字段较完整", "structured sample looks complete")}</span>
                    )}
                  </div>
                  <div className="pattern-meta">
                    <span>{sample.likeCount} {t("点赞", "likes")} · {formatStatus(sample.collectorMode, locale)} · {sample.provider}</span>
                    <span>{sample.authorName || "--"} · {sample.publishTime || "--"}</span>
                  </div>
                  <p className="sample-summary">{sample.contentText || sample.contentSummary}</p>
                  <div className="pattern-meta">
                    <span>{sample.tags.join(" · ")}</span>
                    <span>
                      {sample.mediaImageUrls.length} {t("张图片", "images")} · {sample.mediaVideoUrls.length} {t("个视频", "videos")}
                    </span>
                  </div>
                  <a className="sample-link" href={sample.sourceUrl} target="_blank" rel="noreferrer">
                    {sample.sourceUrl}
                  </a>
                </div>
              ))}
            </div>
          </article>

          <article className="panel" id="analyze">
            <div className="panel-head">
              <h3>{t("分析结果", "Analyses")}</h3>
              <span className="pill">{t("分析器", "Analyzer")}</span>
            </div>
            <div className="action-row">
              <button onClick={handleAnalyze} disabled={loading || samples.length === 0}>{t("分析前 5 条样本", "Analyze First 5 Samples")}</button>
              <button className="secondary-btn" onClick={handleExtractPattern} disabled={loading || analyses.length === 0}>
                {t("提炼 Pattern", "Extract Pattern")}
              </button>
            </div>
            <div className="pattern-list">
              {analyses.slice(0, 4).map((analysis) => (
                <div
                  className={`pattern-card ${workflowResult?.analyses?.some((item) => item.id === analysis.id) ? "result-highlight" : ""}`}
                  key={analysis.id}
                >
                  <strong>{analysis.hookType}</strong>
                  <span>{analysis.structureType}</span>
                  <div className="audit-meta">
                    <span className={`audit-pill ${analysis.fallbackStatus}`}>{formatAiSource(analysis, locale)}</span>
                    <span>{analysis.promptVersion}</span>
                    {workflowResult?.analyses?.some((item) => item.id === analysis.id) ? (
                      <span className="result-badge">{t("最近工作流", "latest workflow")}</span>
                    ) : null}
                  </div>
                  <div className="pattern-meta">
                    <span>{analysis.sampleId}</span>
                    <span>{analysis.summary}</span>
                  </div>
                  {analysis.fallbackReason ? <span className="status-note">fallback: {analysis.fallbackReason}</span> : null}
                </div>
              ))}
            </div>
          </article>

          <article className="panel" id="patterns">
            <div className="panel-head">
              <h3>{t("Pattern 模式库", "Pattern Library")}</h3>
              <span className="pill">{t("模式引擎", "Pattern Engine")}</span>
            </div>
            <div className="pattern-list">
              {patterns.map((pattern) => (
                <div
                  className={`pattern-card ${workflowResult?.pattern?.id === pattern.id ? "result-highlight" : ""}`}
                  key={pattern.id}
                >
                  <strong>{pattern.name}</strong>
                  <span>{pattern.topic}</span>
                  <div className="audit-meta">
                    <span className={`audit-pill ${pattern.fallbackStatus}`}>{formatAiSource(pattern, locale)}</span>
                    <span>{pattern.promptVersion}</span>
                    {workflowResult?.pattern?.id === pattern.id ? <span className="result-badge">{t("最近工作流", "latest workflow")}</span> : null}
                  </div>
                  <div className="pattern-meta">
                    <span>{t("置信度", "confidence")} {Math.round(pattern.confidenceScore * 100)}%</span>
                    <span>{pattern.sourceSampleIds.length} {t("条来源", "sources")}</span>
                  </div>
                  <span>{pattern.description}</span>
                  {pattern.fallbackReason ? <span className="status-note">fallback: {pattern.fallbackReason}</span> : null}
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="panel-grid panel-grid-bottom">
          <article className="panel panel-wide" id="generate">
            <div className="panel-head">
              <h3>{t("生成草稿", "Generate Draft")}</h3>
              <span className="pill">{t("生成器", "Generator")}</span>
            </div>
            <form className="stack-form" onSubmit={handleGenerate}>
              <div className="field-grid">
                <label>
                  {t("Pattern", "Pattern")}
                  <select
                    value={generateForm.patternId}
                    onChange={(event) => setGenerateForm((prev) => ({ ...prev, patternId: event.target.value }))}
                  >
                    <option value="">{t("不使用 Pattern", "No pattern")}</option>
                    {patterns.map((pattern) => (
                      <option key={pattern.id} value={pattern.id}>
                        {pattern.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("主题", "Topic")}
                  <input
                    value={generateForm.topic}
                    onChange={(event) => setGenerateForm((prev) => ({ ...prev, topic: event.target.value }))}
                  />
                </label>
              </div>
              <label>
                {t("目标", "Goal")}
                <textarea
                  rows={3}
                  value={generateForm.goal}
                  onChange={(event) => setGenerateForm((prev) => ({ ...prev, goal: event.target.value }))}
                />
              </label>
              <div className="field-grid">
                <label>
                  {t("语气", "Tone")}
                  <input
                    value={generateForm.tone}
                    onChange={(event) => setGenerateForm((prev) => ({ ...prev, tone: event.target.value }))}
                  />
                </label>
                <label>
                  {t("目标受众", "Audience")}
                  <input
                    value={generateForm.targetAudience}
                    onChange={(event) =>
                      setGenerateForm((prev) => ({ ...prev, targetAudience: event.target.value }))
                    }
                  />
                </label>
              </div>
              <button disabled={loading} type="submit">
                {loading ? t("生成中...", "Generating...") : t("生成草稿", "Generate Draft")}
              </button>
            </form>
          </article>

          <article className="panel" id="generated">
            <div className="panel-head">
              <h3>{t("最新草稿", "Latest Draft")}</h3>
              <span className="pill">{t("输出", "Output")}</span>
            </div>
            {generated ? (
              <div className={`draft-card ${workflowResult?.generated?.id === generated.id ? "result-highlight" : ""}`}>
                <strong>{generated.titleCandidates[0]}</strong>
                {workflowResult?.generated?.id === generated.id ? (
                  <div className="audit-meta">
                    <span className="result-badge">{t("最近工作流", "latest workflow")}</span>
                  </div>
                ) : null}
                <div className="audit-meta">
                  <span className={`audit-pill ${generated.fallbackStatus}`}>{formatAiSource(generated, locale)}</span>
                  <span>{generated.promptVersion}</span>
                </div>
                <div className="draft-tags">
                  {generated.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <p>{generated.bodyText}</p>
                <div className="draft-footer">
                  <span>{generated.coverCopy}</span>
                  <span>{generated.generationNotes}</span>
                </div>
                {generated.fallbackReason ? <span className="status-note">fallback: {generated.fallbackReason}</span> : null}
              </div>
            ) : (
              <p className="empty-state">{t("运行生成流程后，这里会展示最新的小红书草稿。", "Run the generate flow to preview the latest Xiaohongshu draft.")}</p>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}
