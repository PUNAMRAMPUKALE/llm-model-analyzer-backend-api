import axios from 'axios';
import { ENV } from '../../config/env.js';

type MetricScores = Record<string, number>;

export type MetricsResponse = {
  scores: MetricScores;
  details: Record<string, unknown>;
  overall_quality: number;
  schema_version: string;
  model_versions: Record<string, string>;
};

export class MetricsClient {
  constructor(private base = ENV.METRICS_SERVICE_URL) {}

  async health() {
    const { data } = await axios.get(`${this.base}/health`);
    return data;
    }

  async compute(prompt: string, response: string) {
    const { data } = await axios.post<MetricsResponse>(`${this.base}/metrics`, {
      prompt, response
    });
    return data;
  }
}
