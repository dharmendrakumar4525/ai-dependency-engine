import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transcript } from '../persistence/entities/transcript.entity';
import { Task } from '../persistence/entities/task.entity';
import { Job } from '../persistence/entities/job.entity';
import { GraphModule } from '../graph/graph.module';
import { TranscriptController } from './transcript.controller';
import { TranscriptService } from './transcript.service';
import { MockTranscriptParser } from './mock-transcript.parser';
import { LLMTranscriptParser } from './llm-transcript.parser';
import { TRANSCRIPT_PARSER } from './transcript-parser.interface';

@Module({
  imports: [TypeOrmModule.forFeature([Transcript, Task, Job]), GraphModule],
  controllers: [TranscriptController],
  providers: [
    TranscriptService,
    {
      provide: TRANSCRIPT_PARSER,
      useFactory: () => {
        if (process.env.OPENAI_API_KEY?.trim()) {
          return new LLMTranscriptParser();
        }
        return new MockTranscriptParser();
      },
    },
  ],
  exports: [TranscriptService],
})
export class TranscriptModule {}
