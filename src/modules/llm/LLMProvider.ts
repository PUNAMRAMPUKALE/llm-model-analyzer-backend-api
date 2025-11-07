import type { LLMParams, Generated } from '../../domain/models.js';

export interface LLMProvider {
  generate(prompt: string, params: LLMParams): Promise<Generated>;
}

export function countTokens(text: string) {
  // simple token estimator
  return Math.max(1, Math.ceil(text.split(/\s+/).length * 1.3));
}
