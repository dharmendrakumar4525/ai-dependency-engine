import { ApiProperty } from '@nestjs/swagger';

export class TaskResponseDto {
  @ApiProperty({ example: 'task-1' })
  id: string;

  @ApiProperty({ example: 'Review meeting notes' })
  description: string;

  @ApiProperty({ enum: ['High', 'Medium', 'Low'] })
  priority: string;

  @ApiProperty({ type: [String], example: [] })
  dependencies: string[];

  @ApiProperty({ enum: ['Ready', 'Blocked/Error'] })
  status: string;
}
