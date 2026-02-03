import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ProcessTranscriptDto {
  @ApiProperty({
    description: 'Meeting transcript as plain text',
    example: 'Action: Review docs. Action: Deploy.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500_000)
  transcript: string;
}
