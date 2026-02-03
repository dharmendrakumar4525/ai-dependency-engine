import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Transcript } from './transcript.entity';

@Entity('tasks')
@Unique(['transcriptId', 'taskId'])
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  taskId: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 10 })
  priority: string;

  @Column({ type: 'simple-json' })
  dependencies: string[];

  @Column({ type: 'varchar', length: 20, default: 'Ready' })
  status: string;

  @Column()
  transcriptId: string;

  @ManyToOne(() => Transcript, (t) => t.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transcriptId' })
  transcript: Transcript;

  @CreateDateColumn()
  createdAt: Date;
}
