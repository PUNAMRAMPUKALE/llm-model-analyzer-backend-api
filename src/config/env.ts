import 'dotenv/config';

export const ENV = {
  PORT: process.env.PORT ? Number(process.env.PORT) : 4000,
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  DATABASE_URL: process.env.DATABASE_URL!,
  METRICS_SERVICE_URL: process.env.METRICS_SERVICE_URL ?? 'http://localhost:9090',
  LLM_PROVIDER: process.env.LLM_PROVIDER ?? 'mock',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '',
};
