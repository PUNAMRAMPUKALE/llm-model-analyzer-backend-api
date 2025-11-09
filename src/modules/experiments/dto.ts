import { z } from 'zod';

// dto.ts
export const GridSpecSchema = z.object({
  temperature: z.array(z.number()).optional(),
  top_p:       z.array(z.number()).optional(),
  top_k:       z.array(z.number()).optional(),
  max_tokens:  z.array(z.number()).optional(),
  samples:     z.number().min(1).max(10).optional(),
  seed:        z.number().nullable().optional(),
}).strip();  // instead of .strict()

export const CreateExperimentSchema = z.object({
  title: z.string().min(1),
  prompt: z.string().min(1),
  model: z.string().min(1),
  gridSpec: GridSpecSchema,
});

export type CreateExperimentDto = z.infer<typeof CreateExperimentSchema>;

export const IdParamSchema = z.object({ id: z.string().min(1) });

export const PageQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type PageQuery = z.infer<typeof PageQuerySchema>;
