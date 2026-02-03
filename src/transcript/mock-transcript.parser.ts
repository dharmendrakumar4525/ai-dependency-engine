import { Injectable } from '@nestjs/common';
import { RawTask } from '../graph/graph.types';
import { ITranscriptParser } from './transcript-parser.interface';

const SKIP_PATTERNS = [
  /^\*\*Meeting Title\*\*/i,
  /^\*\*Date\*\*/i,
  /^\*\*Attendees\*\*/i,
  /^---\s*$/,
  /^\s*$/,
];

function isMetadataOrSeparator(line: string): boolean {
  const t = line.trim();
  return SKIP_PATTERNS.some((p) => p.test(t)) || t.length < 3;
}

@Injectable()
export class MockTranscriptParser implements ITranscriptParser {
  async parse(transcript: string): Promise<RawTask[]> {
    const allLines = transcript
      .trim()
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const lines = allLines.filter((line) => !isMetadataOrSeparator(line));
    if (lines.length === 0) {
      return [
        {
          id: 'task-1',
          description: 'Review meeting notes',
          priority: 'High',
          dependencies: [],
        },
      ];
    }
    return lines.slice(0, 25).map((line, i) => ({
      id: `task-${i + 1}`,
      description: line.slice(0, 500),
      priority: (['High', 'Medium', 'Low'] as const)[i % 3],
      dependencies: i > 0 ? [`task-${i}`] : [],
    }));
  }
}
