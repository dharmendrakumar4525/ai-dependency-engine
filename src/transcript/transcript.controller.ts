import { BadRequestException, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { TranscriptService, ProcessResult } from './transcript.service';
import { getTranscriptFromRequest, validateTranscriptLength } from './transcript-body.helper';

@ApiTags('transcript')
@Controller('transcript')
export class TranscriptController {
  constructor(private readonly transcriptService: TranscriptService) {}

  @Post('process')
  @HttpCode(HttpStatus.CREATED)
  async process(@Req() req: Request): Promise<ProcessResult> {
    const transcript = getTranscriptFromRequest(req);
    if (!transcript) {
      throw new BadRequestException('transcript required');
    }
    try {
      validateTranscriptLength(transcript);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : 'Invalid transcript');
    }
    return this.transcriptService.processTranscript(transcript);
  }
}
