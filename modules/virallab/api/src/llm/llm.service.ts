import { Injectable, Logger } from "@nestjs/common";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

@Injectable()
export class ViralLabLlmService {
  private readonly logger = new Logger(ViralLabLlmService.name);

  isEnabled() {
    if (typeof process.env.VIRALLAB_USE_LLM !== "undefined") {
      return String(process.env.VIRALLAB_USE_LLM) === "true";
    }
    return Boolean(process.env.LLM_BASE_URL && process.env.LLM_API_KEY && process.env.LLM_MODEL);
  }

  getConfig() {
    return {
      baseUrl: process.env.LLM_BASE_URL,
      apiKey: process.env.LLM_API_KEY,
      model: process.env.LLM_MODEL,
      timeoutMs: Number(process.env.LLM_TIMEOUT_MS || 20000),
    };
  }

  async chatJson<T>(params: {
    messages: ChatMessage[];
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
  }): Promise<T> {
    const raw = await this.chat(params);
    const normalized = this.stripMarkdownFence(raw);
    return JSON.parse(normalized) as T;
  }

  async chat(params: {
    messages: ChatMessage[];
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
  }) {
    const { baseUrl, apiKey, model, timeoutMs } = this.getConfig();
    if (!baseUrl || !apiKey || !model) {
      throw new Error("LLM config missing");
    }

    const controller = new AbortController();
    const effectiveTimeoutMs =
      Number.isFinite(params.timeoutMs) && Number(params.timeoutMs) > 0
        ? Number(params.timeoutMs)
        : Number.isFinite(timeoutMs) && timeoutMs > 0
          ? timeoutMs
          : 20000;
    const timer = setTimeout(() => controller.abort(), effectiveTimeoutMs);

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: params.messages,
          temperature: typeof params.temperature === "number" ? params.temperature : 0.2,
          ...(params.maxTokens ? { max_tokens: params.maxTokens } : {}),
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`LLM request failed: ${response.status} ${text.slice(0, 400)}`);
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("LLM response missing content");
      }
      return String(content);
    } catch (error) {
      this.logger.warn(`LLM chat failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  private stripMarkdownFence(value: string) {
    const trimmed = value.trim();
    if (!trimmed.startsWith("```")) return trimmed;
    return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
}
