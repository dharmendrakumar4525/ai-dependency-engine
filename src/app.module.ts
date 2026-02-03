import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDataSourceOptions } from './config/database.config';
import { TranscriptModule } from './transcript/transcript.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(getDataSourceOptions() as any),
    TranscriptModule,
    JobsModule,
  ],
})
export class AppModule {}
