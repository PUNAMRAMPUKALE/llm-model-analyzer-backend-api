/**
 * LLMProvider interface + lightweight token estimator used by Mock/Groq.
 */
import type { LLMParams, Generated } from "../../domain/models.js";

export interface LLMProvider {
  generate(prompt: string, params: LLMParams): Promise<Generated>;
}

/** Very rough token estimator to keep charts functional without provider usage. */
export function countTokens(text: string) {
  return Math.max(1, Math.ceil(text.split(/\s+/).length * 1.3));
}
