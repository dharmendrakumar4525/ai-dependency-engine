import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { TranscriptModule } from '../transcript/transcript.module';

@Module({
  imports: [TranscriptModule],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
