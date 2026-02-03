import { ApiProperty } from '@nestjs/swagger';
import { TaskResponseDto } from './task-response.dto';

export class ProcessResultDto {
  @ApiProperty()
  transcriptId: string;

  @ApiProperty({ type: [TaskResponseDto] })
  tasks: TaskResponseDto[];
}
