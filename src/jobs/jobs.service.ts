import { Injectable, NotFoundException } from '@nestjs/common';
import {
  TranscriptService,
  JobSubmitResult,
  JobStatusResult,
} from '../transcript/transcript.service';

@Injectable()
export class JobsService {
  constructor(private readonly transcriptService: TranscriptService) {}

  async submit(transcript: string): Promise<JobSubmitResult> {
    return this.transcriptService.submitJob(transcript);
  }

  async getStatus(jobId: string): Promise<JobStatusResult> {
    const result = await this.transcriptService.getJobStatus(jobId);
    if (!result) throw new NotFoundException('Job not found');
    return result;
  }
}
