export type GridSpec = {
  temperature?: number[];
  top_p?: number[];
  top_k?: number[];
  max_tokens?: number[];
  samples?: number;
  seed?: number | null;
};

export type LLMParams = {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  max_tokens?: number;
  seed?: number | null;
  model: string;

  // NEW – improves diversity
  presence_penalty?: number;
  frequency_penalty?: number;
};


export type Generated = {
  params: LLMParams;
  text: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
};
