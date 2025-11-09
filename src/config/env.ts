import 'dotenv/config';

export const ENV = {
  PORT: process.env.PORT ? Number(process.env.PORT) : 4000,
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  DATABASE_URL: process.env.DATABASE_URL!,
  METRICS_SERVICE_URL: process.env.METRICS_SERVICE_URL ?? 'http://localhost:8080',
    GROQ_API_KEY: process.env.GROQ_API_KEY ?? '',
};
