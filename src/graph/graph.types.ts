export type Priority = 'High' | 'Medium' | 'Low';

export interface RawTask {
  id: string;
  description: string;
  priority: Priority;
  dependencies: string[];
}

export interface TaskWithStatus extends RawTask {
  status: 'Ready' | 'Blocked/Error';
}
