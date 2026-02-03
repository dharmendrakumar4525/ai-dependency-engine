import { Injectable } from '@nestjs/common';
import { ITranscriptParser } from './transcript-parser.interface';
import { MockTranscriptParser } from './mock-transcript.parser';
import { LLMTranscriptParser } from './llm-transcript.parser';

@Injectable()
export class TranscriptParserFactory {
  create(): ITranscriptParser {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (apiKey) {
      return new LLMTranscriptParser();
    }
    return new MockTranscriptParser();
  }
}
