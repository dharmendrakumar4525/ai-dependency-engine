import { ApiProperty } from '@nestjs/swagger';

export class JobSubmitResultDto {
  @ApiProperty()
  jobId: string;

  @ApiProperty({ enum: ['pending', 'completed'] })
  status: string;
}
