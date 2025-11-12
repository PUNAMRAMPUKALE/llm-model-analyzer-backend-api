// backend/src/modules/llm/LLMProvider.ts
import type { LLMParams, Generated } from "../../domain/models.js";

export interface LLMProvider {
  generate(prompt: string, params: LLMParams): Promise<Generated>;
}
