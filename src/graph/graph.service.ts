import { Injectable } from '@nestjs/common';
import { RawTask, TaskWithStatus } from './graph.types';

@Injectable()
export class GraphService {
  /**
   * Remove dependency IDs that do not exist in the task set.
   */
  sanitizeDependencies(tasks: RawTask[]): RawTask[] {
    const idSet = new Set(tasks.map((t) => t.id));
    return tasks.map((task) => ({
      ...task,
      dependencies: (task.dependencies || []).filter((id) => idSet.has(id)),
    }));
  }

  /**
   * DFS-based cycle detection; tasks in cycles are marked Blocked/Error.
   */
  detectCyclesAndSetStatus(tasks: RawTask[]): TaskWithStatus[] {
    const idToIndex = new Map<string, number>();
    tasks.forEach((t, i) => idToIndex.set(t.id, i));
    const sortedIds = [...tasks.map((t) => t.id)].sort();

    const adj = new Map<string, string[]>();
    for (const task of tasks) {
      const deps = task.dependencies || [];
      adj.set(task.id, [...deps].sort());
    }

    const inCycle = new Set<string>();
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const pathIds: string[] = [];
    const pathSet = new Set<string>();

    const visit = (id: string): void => {
      if (inCycle.has(id)) return;
      if (recStack.has(id)) {
        let i = pathIds.length - 1;
        while (i >= 0 && pathIds[i] !== id) {
          inCycle.add(pathIds[i]);
          i--;
        }
        inCycle.add(id);
        return;
      }
      if (visited.has(id)) return;
      visited.add(id);
      recStack.add(id);
      pathIds.push(id);
      pathSet.add(id);
      for (const dep of adj.get(id) ?? []) {
        visit(dep);
      }
      pathIds.pop();
      pathSet.delete(id);
      recStack.delete(id);
    };

    for (const id of sortedIds) {
      visit(id);
    }

    return tasks.map((task) => ({
      ...task,
      status: inCycle.has(task.id)
        ? ('Blocked/Error' as const)
        : ('Ready' as const),
    }));
  }

  processGraph(tasks: RawTask[]): TaskWithStatus[] {
    const sanitized = this.sanitizeDependencies(tasks);
    return this.detectCyclesAndSetStatus(sanitized);
  }
}
