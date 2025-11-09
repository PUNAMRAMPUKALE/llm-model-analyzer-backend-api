// src/modules/llm/GroqProvider.ts
import { ENV } from "../../config/env.js";
import type { LLMParams, Generated } from "../../domain/models.js";

export class GroqProvider {
  private apiKey = ENV.GROQ_API_KEY!;
  private baseURL = "https://api.groq.com/openai/v1";
  private model = "llama-3.3-70b-versatile";

  async generate(prompt: string, params: LLMParams): Promise<Generated> {
    if (!this.apiKey) throw new Error("GROQ_API_KEY missing");

    const body: any = {
      model: params.model ?? this.model,
      messages: [{ role: "user", content: prompt }],
      temperature: params.temperature,
      top_p: params.top_p,
      max_tokens: params.max_tokens ?? 256,
      stream: false,
    };
    if (params.top_k !== undefined) body.top_k = params.top_k;
    if (params.seed !== null && params.seed !== undefined) body.seed = params.seed;

    const started = Date.now();
    const res = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
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
