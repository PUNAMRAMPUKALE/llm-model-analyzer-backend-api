import { ENV } from "../../config/env.js";
import type { LLMParams, Generated } from "../../domain/models.js";
import type { LLMProvider } from "./LLMProvider.js";   // <-- new

export class GroqProvider implements LLMProvider {     // <-- implement
  private apiKey = ENV.GROQ_API_KEY!;
  private baseURL = "https://api.groq.com/openai/v1";
  private defaultModel = "llama-3.3-70b-versatile";

  async generate(prompt: string, params: LLMParams): Promise<Generated> {
    if (!this.apiKey) throw new Error("GROQ_API_KEY missing");
    const body: Record<string, any> = {
      model: params.model ?? this.defaultModel,
      messages: [{ role: "user", content: prompt }],
      stream: false,
    };
    if (params.temperature !== undefined) body.temperature = params.temperature;
    if (params.top_p !== undefined) body.top_p = params.top_p;
    if (params.max_tokens !== undefined) body.max_tokens = params.max_tokens;
    if (params.seed !== undefined && params.seed !== null) body.seed = params.seed;
    if ((params as any).presence_penalty !== undefined)
      body.presence_penalty = (params as any).presence_penalty;
    if ((params as any).frequency_penalty !== undefined)
      body.frequency_penalty = (params as any).frequency_penalty;

    const started = Date.now();
    const res = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(`Groq error ${res.status}: ${msg}`);
    }
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    const latencyMs = Date.now() - started;
    const tokensIn = data.usage?.prompt_tokens ?? 0;
    const tokensOut = data.usage?.completion_tokens ?? 0;

    return { text, tokensIn, tokensOut, latencyMs, params };
  }
}
