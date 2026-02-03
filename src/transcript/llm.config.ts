const DEFAULT_MS = 60_000;

export const LLM_TIMEOUT_MS =
  parseInt(process.env.LLM_TIMEOUT_MS ?? String(DEFAULT_MS), 10) || DEFAULT_MS;
