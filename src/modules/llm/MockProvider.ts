/**
 * MockProvider
 * Deterministic, dependency-free generator used when no API key is configured.
 * Useful for local development and CI.
 */
import type { LLMProvider } from "./LLMProvider.js";
import type { LLMParams, Generated } from "../../domain/models.js";
import { countTokens } from "./LLMProvider.js";

export class MockProvider implements LLMProvider {
  async generate(prompt: string, params: LLMParams): Promise<Generated> {
    const started = Date.now();
    const temp = params.temperature ?? 0.5;
    const tone =
      temp > 0.7 ? "more creative" : temp < 0.3 ? "more deterministic" : "balanced";

    // Short, predictable response that still drives the UI & metrics.
    const text = `Mocked answer (${tone}): ${prompt.slice(0, 160)} …`;
    const latencyMs = Math.floor(200 + Math.random() * 300);

    // Simulate latency so the UI's loading states are exercised.
    await new Promise((r) => setTimeout(r, latencyMs));

    return {
      params,
      text,
      tokensIn: countTokens(prompt),
      tokensOut: countTokens(text),
      latencyMs: Date.now() - started,
    };
    }
}
