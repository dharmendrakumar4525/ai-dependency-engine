import { DataSourceOptions } from 'typeorm';
import { Transcript } from '../persistence/entities/transcript.entity';
import { Task } from '../persistence/entities/task.entity';
import { Job } from '../persistence/entities/job.entity';

const entities = [Transcript, Task, Job];

export function getDataSourceOptions(): DataSourceOptions {
  const usePostgres = process.env.DB_TYPE === 'postgres';

  if (usePostgres) {
    return {
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME ?? 'insightboard',
      entities,
      synchronize: process.env.NODE_ENV !== 'production',
    };
  }

  return {
    type: 'better-sqlite3',
    database: process.env.DB_PATH ?? './data/insightboard.sqlite',
    entities,
    synchronize: true,
  };
}
