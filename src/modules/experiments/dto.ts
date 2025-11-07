import { z } from 'zod';

export const CreateExperimentSchema = z.object({
  title: z.string().min(1),
  prompt: z.string().min(1),
  model: z.string().default('mock-model'),
  gridSpec: z.object({
    temperature: z.array(z.number()).default([0,0.3,0.6,0.9]).optional(),
    top_p: z.array(z.number()).default([0.7,0.9]).optional(),
    top_k: z.array(z.number()).optional(),
    max_tokens: z.array(z.number()).optional(),
    samples: z.number().default(2).optional(),
    seed: z.number().nullable().optional()
  })
});

export type CreateExperimentDto = z.infer<typeof CreateExperimentSchema>;
