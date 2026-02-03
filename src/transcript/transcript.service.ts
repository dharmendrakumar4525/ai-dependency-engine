import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { GraphService } from '../graph/graph.service';
import { Transcript } from '../persistence/entities/transcript.entity';
import { Task } from '../persistence/entities/task.entity';
import { Job } from '../persistence/entities/job.entity';
import { TaskWithStatus } from '../graph/graph.types';
import { TRANSCRIPT_PARSER } from './transcript-parser.interface';
import type { ITranscriptParser } from './transcript-parser.interface';
import { TaskResponseDto } from './dto/task-response.dto';

export interface ProcessResult {
  transcriptId: string;
  tasks: TaskResponseDto[];
}

export interface JobSubmitResult {
  jobId: string;
  status: string;
}

export interface JobStatusResult {
  jobId: string;
  status: string;
  transcriptId?: string;
  tasks?: TaskResponseDto[];
  errorMessage?: string;
  errorCode?: string;
}

@Injectable()
export class TranscriptService {
  constructor(
    @InjectRepository(Transcript)
    private readonly transcriptRepo: Repository<Transcript>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    private readonly graphService: GraphService,
    @Inject(TRANSCRIPT_PARSER)
    private readonly parser: ITranscriptParser,
  ) {}

  async processTranscript(transcript: string): Promise<ProcessResult> {
    const rawTasks = await this.parser.parse(transcript);
    const tasksWithStatus = this.graphService.processGraph(rawTasks);
    const transcriptEntity = this.transcriptRepo.create({
      rawText: transcript,
    });
    const saved = await this.transcriptRepo.save(transcriptEntity);
    await this.saveTasks(saved.id, tasksWithStatus);
    return {
      transcriptId: saved.id,
      tasks: tasksWithStatus.map(toTaskDto),
    };
  }

  private async saveTasks(
    transcriptId: string,
    tasks: TaskWithStatus[],
  ): Promise<void> {
    const entities = tasks.map((t) =>
      this.taskRepo.create({
        taskId: t.id,
        description: t.description,
        priority: t.priority,
        dependencies: t.dependencies,
        status: t.status,
        transcriptId,
      }),
    );
    await this.taskRepo.save(entities);
  }

  private static hashTranscript(transcript: string): string {
    return createHash('sha256').update(transcript.trim()).digest('hex');
  }

  async submitJob(transcript: string): Promise<JobSubmitResult> {
    const hash = TranscriptService.hashTranscript(transcript);
    const existing = await this.jobRepo.findOne({
      where: { transcriptHash: hash, status: 'completed' },
      order: { completedAt: 'DESC' },
    });
    if (existing) {
      return { jobId: existing.id, status: 'completed' };
    }
    const job = this.jobRepo.create({
      transcriptHash: hash,
      status: 'pending',
    });
    const saved = await this.jobRepo.save(job);
    this.runJobAsync(saved.id, transcript).catch(() => {});
    return { jobId: saved.id, status: 'pending' };
  }

  private async runJobAsync(jobId: string, transcript: string): Promise<void> {
    try {
      const rawTasks = await this.parser.parse(transcript);
      const tasksWithStatus = this.graphService.processGraph(rawTasks);
      const transcriptEntity = this.transcriptRepo.create({
        rawText: transcript,
      });
      const savedTranscript = await this.transcriptRepo.save(transcriptEntity);
      await this.saveTasks(savedTranscript.id, tasksWithStatus);
      await this.jobRepo.update(jobId, {
        status: 'completed',
        transcriptId: savedTranscript.id,
        completedAt: new Date(),
        errorMessage: null,
        errorCode: null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const code = err instanceof Error && 'name' in err ? (err as Error & { name?: string }).name : undefined;
      await this.jobRepo.update(jobId, {
        status: 'failed',
        errorMessage: msg.slice(0, 2000),
        errorCode: code ?? null,
      });
    }
  }

  async getJobStatus(jobId: string): Promise<JobStatusResult | null> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) return null;
    const result: JobStatusResult = {
      jobId: job.id,
      status: job.status,
    };
    if (job.errorMessage) result.errorMessage = job.errorMessage;
    if (job.errorCode) result.errorCode = job.errorCode;
    if (job.status === 'completed' && job.transcriptId) {
      const tasks = await this.taskRepo.find({
        where: { transcriptId: job.transcriptId },
        order: { taskId: 'ASC' },
      });
      result.transcriptId = job.transcriptId;
      result.tasks = tasks.map((t) => ({
        id: t.taskId,
        description: t.description,
        priority: t.priority,
        dependencies: t.dependencies,
        status: t.status,
      }));
    }
    return result;
  }
}

function toTaskDto(t: TaskWithStatus): TaskResponseDto {
  return {
    id: t.id,
    description: t.description,
    priority: t.priority,
    dependencies: t.dependencies,
    status: t.status,
  };
}
