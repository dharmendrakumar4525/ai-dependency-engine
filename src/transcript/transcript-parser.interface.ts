import { RawTask } from '../graph/graph.types';

export const TRANSCRIPT_PARSER = 'TRANSCRIPT_PARSER';

export interface ITranscriptParser {
  parse(transcript: string): Promise<RawTask[]>;
}
