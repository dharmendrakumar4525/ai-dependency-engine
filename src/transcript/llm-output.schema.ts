import { z } from 'zod';

/** Validates shape. Normalization fixes id format, priority enum, dedup. */
const rawTaskSchema = z.object({
  id: z.string(),
  description: z.string().optional().default(''),
  priority: z.string().optional().default('Medium'),
  dependencies: z.array(z.string()).optional().default([]),
});

export const llmTasksResponseSchema = z.object({
  tasks: z.array(rawTaskSchema),
});

export type LLMTasksResponse = z.infer<typeof llmTasksResponseSchema>;

export function parseAndValidateLlmOutput(content: unknown): LLMTasksResponse {
  const parsed =
    typeof content === 'string'
      ? (() => {
          try {
            return JSON.parse(content) as unknown;
          } catch {
            throw new Error('LLM response was not valid JSON');
          }
        })()
      : content;

  const result = llmTasksResponseSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`LLM output schema validation failed: ${issues}`);
  }
  return result.data;
}
