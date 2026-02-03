import { Test, TestingModule } from '@nestjs/testing';
import { GraphService } from './graph.service';
import { RawTask } from './graph.types';

describe('GraphService', () => {
  let service: GraphService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GraphService],
    }).compile();
    service = module.get(GraphService);
  });

  describe('sanitizeDependencies', () => {
    it('removes dependency IDs that do not exist', () => {
      const tasks: RawTask[] = [
        { id: 'task-1', description: 'A', priority: 'High', dependencies: [] },
        { id: 'task-2', description: 'B', priority: 'Medium', dependencies: ['task-1', 'task-99'] },
        { id: 'task-3', description: 'C', priority: 'Low', dependencies: ['task-fake'] },
      ];
      const out = service.sanitizeDependencies(tasks);
      expect(out[0].dependencies).toEqual([]);
      expect(out[1].dependencies).toEqual(['task-1']);
      expect(out[2].dependencies).toEqual([]);
    });

    it('keeps valid deps as-is', () => {
      const tasks: RawTask[] = [
        { id: 'task-1', description: 'A', priority: 'High', dependencies: [] },
        { id: 'task-2', description: 'B', priority: 'Medium', dependencies: ['task-1'] },
      ];
      const out = service.sanitizeDependencies(tasks);
      expect(out[1].dependencies).toEqual(['task-1']);
    });
  });

  describe('detectCyclesAndSetStatus', () => {
    it('marks simple cycle as Blocked/Error', () => {
      const tasks: RawTask[] = [
        { id: 'task-1', description: 'A', priority: 'High', dependencies: ['task-2'] },
        { id: 'task-2', description: 'B', priority: 'Medium', dependencies: ['task-1'] },
      ];
      const out = service.detectCyclesAndSetStatus(tasks);
      expect(out[0].status).toBe('Blocked/Error');
      expect(out[1].status).toBe('Blocked/Error');
    });

    it('marks complex cycle correctly', () => {
      const tasks: RawTask[] = [
        { id: 'task-1', description: 'A', priority: 'High', dependencies: ['task-2'] },
        { id: 'task-2', description: 'B', priority: 'Medium', dependencies: ['task-3'] },
        { id: 'task-3', description: 'C', priority: 'Low', dependencies: ['task-1'] },
      ];
      const out = service.detectCyclesAndSetStatus(tasks);
      expect(out.every((t) => t.status === 'Blocked/Error')).toBe(true);
    });

    it('leaves acyclic tasks Ready', () => {
      const tasks: RawTask[] = [
        { id: 'task-1', description: 'A', priority: 'High', dependencies: [] },
        { id: 'task-2', description: 'B', priority: 'Medium', dependencies: ['task-1'] },
      ];
      const out = service.detectCyclesAndSetStatus(tasks);
      expect(out[0].status).toBe('Ready');
      expect(out[1].status).toBe('Ready');
    });

    it('only marks cycle nodes, not dependents outside cycle', () => {
      const tasks: RawTask[] = [
        { id: 'task-1', description: 'A', priority: 'High', dependencies: ['task-2'] },
        { id: 'task-2', description: 'B', priority: 'Medium', dependencies: ['task-1'] },
        { id: 'task-3', description: 'C', priority: 'Low', dependencies: ['task-1'] },
      ];
      const out = service.detectCyclesAndSetStatus(tasks);
      expect(out[0].status).toBe('Blocked/Error');
      expect(out[1].status).toBe('Blocked/Error');
      expect(out[2].status).toBe('Ready');
    });
  });

  describe('processGraph', () => {
    it('sanitizes then detects cycles', () => {
      const tasks: RawTask[] = [
        { id: 'task-1', description: 'A', priority: 'High', dependencies: ['task-2'] },
        { id: 'task-2', description: 'B', priority: 'Medium', dependencies: ['task-1', 'task-99'] },
      ];
      const out = service.processGraph(tasks);
      expect(out[0].dependencies).toEqual(['task-2']);
      expect(out[1].dependencies).toEqual(['task-1']);
      expect(out[0].status).toBe('Blocked/Error');
      expect(out[1].status).toBe('Blocked/Error');
    });

    it('handles duplicate task IDs without crashing', () => {
      const tasks: RawTask[] = [
        { id: 'task-1', description: 'A', priority: 'High', dependencies: [] },
        { id: 'task-1', description: 'B', priority: 'Medium', dependencies: ['task-1'] },
      ];
      const out = service.processGraph(tasks);
      expect(out).toHaveLength(2);
      expect(out[0].id).toBe('task-1');
      expect(out[1].id).toBe('task-1');
      expect(out[0].status).toBeDefined();
      expect(out[1].status).toBeDefined();
    });
  });
});
