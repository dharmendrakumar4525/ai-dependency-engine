import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JobsService } from './jobs.service';
import { JobSubmitResultDto } from './dto/job-submit.dto';
import { JobStatusResultDto } from './dto/job-status.dto';
import {
  getTranscriptFromRequest,
  validateTranscriptLength,
} from '../transcript/transcript-body.helper';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Submit transcript (async); returns jobId. Idempotent for same transcript.',
    description:
      'Same body options as POST /transcript/process: file (field "transcript"), raw text, or JSON. Returns jobId; poll GET /jobs/:jobId for result.',
  })
  @ApiConsumes('multipart/form-data', 'text/plain', 'application/json')
  @ApiBody({
    required: true,
    description: 'Transcript: file (field "transcript"), raw text, or JSON.',
    schema: {
      oneOf: [
        {
          type: 'object',
          required: ['transcript'],
          properties: {
            transcript: {
              type: 'string',
              format: 'binary',
              description: 'Upload .txt file',
            },
          },
        },
        { type: 'string' },
        {
          type: 'object',
          properties: {
            transcript: { type: 'string' },
            transcriptBase64: { type: 'string' },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Job submitted or existing completed job returned.',
    type: JobSubmitResultDto,
  })
  @ApiResponse({ status: 400, description: 'Transcript missing or too long.' })
  async submit(@Req() req: Request) {
    const transcript = getTranscriptFromRequest(req);
    if (!transcript) {
      throw new BadRequestException(
        'transcript required: upload a file (field "transcript"), raw text, or JSON',
      );
    }
    try {
      validateTranscriptLength(transcript);
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Invalid transcript',
      );
    }
    return this.jobsService.submit(transcript);
  }

  @Get(':jobId')
  @ApiOperation({ summary: 'Get job status and result when completed.' })
  @ApiParam({ name: 'jobId', description: 'UUID returned from POST /jobs' })
  @ApiResponse({ status: 200, type: JobStatusResultDto })
  @ApiResponse({ status: 404, description: 'Job not found.' })
  async getStatus(@Param('jobId') jobId: string) {
    return this.jobsService.getStatus(jobId);
  }
}
