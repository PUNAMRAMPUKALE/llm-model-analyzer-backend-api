import type { LLMProvider } from './LLMProvider.js';
import type { LLMParams, Generated } from '../../domain/models.js';
import { countTokens } from './LLMProvider.js';

export class MockProvider implements LLMProvider {
  async generate(prompt: string, params: LLMParams): Promise<Generated> {
    const start = Date.now();
    const temp = params.temperature ?? 0.5;
    const creativity = temp > 0.7 ? 'more creative' : temp < 0.3 ? 'more deterministic' : 'balanced';
    const text = `Mocked answer (${creativity}): ${prompt.slice(0, 120)} ...`;
    const latencyMs = Math.floor(200 + Math.random() * 300);
    const tokensIn = countTokens(prompt);
    const tokensOut = countTokens(text);
    await new Promise(r => setTimeout(r, latencyMs));
    return { params, text, tokensIn, tokensOut, latencyMs };
  }
}
