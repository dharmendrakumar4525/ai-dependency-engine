import { ApiProperty } from '@nestjs/swagger';
import { TaskResponseDto } from '../../transcript/dto/task-response.dto';

export class JobStatusResultDto {
  @ApiProperty()
  jobId: string;

  @ApiProperty({ enum: ['pending', 'completed', 'failed'] })
  status: string;

  @ApiProperty({ required: false })
  transcriptId?: string;

  @ApiProperty({ type: [TaskResponseDto], required: false })
  tasks?: TaskResponseDto[];

  @ApiProperty({ required: false, description: 'Error message when status is failed' })
  errorMessage?: string;

  @ApiProperty({ required: false, description: 'Error type/code when status is failed' })
  errorCode?: string;
}
