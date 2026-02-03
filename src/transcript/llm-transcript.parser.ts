import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { RawTask } from '../graph/graph.types';
import { ITranscriptParser } from './transcript-parser.interface';
import { parseAndValidateLlmOutput } from './llm-output.schema';
import { LLM_TIMEOUT_MS } from './llm.config';

const SYSTEM_PROMPT = `You extract actionable tasks from meeting transcripts. Return ONLY valid JSON, no other text.

Output format: { "tasks": [ { "id": "task-1", "description": "clear actionable text", "priority": "High"|"Medium"|"Low", "dependencies": ["task-2"] } ] }

Rules:
- id: exactly "task-1", "task-2", ... in order.
- description: one clear action per task, from the meeting.
- priority: High for blockers/P0, Medium for important, Low for backlog.
- dependencies: array of task IDs that must be done before this one (e.g. "Stable build by Monday" depends on "Fix payment bug"). Use empty [] when no dependency.`;

export class LLMTimeoutError extends Error {
  constructor(ms: number) {
    super(`LLM request timed out after ${ms}ms`);
    this.name = 'LLMTimeoutError';
  }
}

@Injectable()
export class LLMTranscriptParser implements ITranscriptParser {
  private readonly client: OpenAI | null;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
    this.model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
    this.timeoutMs = LLM_TIMEOUT_MS;
  }

  async parse(transcript: string): Promise<RawTask[]> {
    if (!this.client) {
      throw new Error('OPENAI_API_KEY is not set; cannot use LLM parser.');
    }
    const text = transcript.trim().slice(0, 120_000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.client.chat.completions.create(
        {
          model: this.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: `Extract tasks from this meeting transcript:\n\n${text}`,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        },
        { signal: controller.signal },
      );
      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error('Empty response from LLM');
      }
      const json = this.stripCodeBlock(content);
      const validated = parseAndValidateLlmOutput(json);
      return this.normalizeTasks(validated);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new LLMTimeoutError(this.timeoutMs);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  private stripCodeBlock(content: string): string {
    const m = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    return m ? m[1].trim() : content;
  }

  /**
   * Dedup ids via auto-suffix. Fix id format and priority.
   */
  private normalizeTasks(parsed: { tasks: Array<{ id: string; description: string; priority: string; dependencies: string[] }> }): RawTask[] {
    const list = parsed.tasks ?? [];
    if (list.length === 0) {
      return [
        {
          id: 'task-1',
          description: 'No tasks extracted from transcript.',
          priority: 'Medium',
          dependencies: [],
        },
      ];
    }
    const priorities = ['High', 'Medium', 'Low'] as const;

    // 1. Parse and validate each task; assign preliminary id (may have duplicates)
    const preliminary = list.slice(0, 100).map((item, index) => {
      const o =
        item && typeof item === 'object'
          ? (item as Record<string, unknown>)
          : {};
      const rawId =
        typeof o.id === 'string' && /^task-\d+$/.test(o.id)
          ? o.id
          : `task-${index + 1}`;
      const description =
        typeof o.description === 'string'
          ? o.description.slice(0, 2000)
          : `Task ${index + 1}`;
      const p =
        typeof o.priority === 'string' &&
        priorities.includes(o.priority as (typeof priorities)[number])
          ? (o.priority as (typeof priorities)[number])
          : 'Medium';
      const deps = Array.isArray(o.dependencies)
        ? o.dependencies.filter((d): d is string => typeof d === 'string')
        : [];
      return { rawId, description, priority: p, dependencies: deps };
    });

    // 2. Resolve duplicate IDs with auto-suffix: first keeps id, duplicates get id-2, id-3, ...
    const assignedIds = new Map<string, number>();
    const tasks: RawTask[] = preliminary.map(({ rawId, description, priority, dependencies }) => {
      let id: string;
      const count = assignedIds.get(rawId) ?? 0;
      if (count === 0) {
        id = rawId;
        assignedIds.set(rawId, 1);
      } else {
        assignedIds.set(rawId, count + 1);
        id = `${rawId}-${count + 1}`;
      }
      return { id, description, priority, dependencies };
    });

    // 3. Dependency refs stay as-is: "task-1" always targets the canonical (first) task-1.
    // Duplicate tasks (task-1-2, task-1-3) keep their deps; sanitizeDependencies validates.
    return tasks;
  }
}
