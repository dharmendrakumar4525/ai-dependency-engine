import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';


export class TaskEntityPrimaryKeyFix1738636800000 implements MigrationInterface {
  name = 'TaskEntityPrimaryKeyFix1738636800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await this.tableExists(queryRunner);
    if (!tableExists) return;

    const hasTaskIdColumn = await this.hasColumn(queryRunner, 'taskId');
    if (hasTaskIdColumn) return; // Already migrated

    const isSQLite =
      queryRunner.connection.driver.options.type === 'better-sqlite3';

    if (isSQLite) {
      await this.migrateSQLite(queryRunner);
    } else {
      await this.migratePostgres(queryRunner);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTaskIdColumn = await this.hasColumn(queryRunner, 'taskId');
    if (!hasTaskIdColumn) return;

    const isSQLite =
      queryRunner.connection.driver.options.type === 'better-sqlite3';

    if (isSQLite) {
      await queryRunner.query(`
        CREATE TABLE "tasks_old" (
          "id" varchar PRIMARY KEY NOT NULL,
          "description" text NOT NULL,
          "priority" varchar(10) NOT NULL,
          "dependencies" text NOT NULL,
          "status" varchar(20) DEFAULT 'Ready',
          "transcriptId" varchar NOT NULL,
          "createdAt" datetime DEFAULT (datetime('now'))
        )
      `);
      await queryRunner.query(`
        INSERT INTO "tasks_old" ("id", "description", "priority", "dependencies", "status", "transcriptId", "createdAt")
        SELECT "taskId", "description", "priority", "dependencies", "status", "transcriptId", "createdAt"
        FROM "tasks"
      `);
      await queryRunner.query(`DROP TABLE "tasks"`);
      await queryRunner.query(`ALTER TABLE "tasks_old" RENAME TO "tasks"`);
    } else {
      await queryRunner.query(`
        CREATE TABLE "tasks_old" (
          "id" varchar PRIMARY KEY NOT NULL,
          "description" text NOT NULL,
          "priority" varchar(10) NOT NULL,
          "dependencies" text NOT NULL,
          "status" varchar(20) DEFAULT 'Ready',
          "transcriptId" varchar NOT NULL,
          "createdAt" TIMESTAMP DEFAULT now()
        )
      `);
      await queryRunner.query(`
        INSERT INTO "tasks_old" ("id", "description", "priority", "dependencies", "status", "transcriptId", "createdAt")
        SELECT "taskId", "description", "priority", "dependencies", "status", "transcriptId", "createdAt"
        FROM "tasks"
      `);
      await queryRunner.query(`DROP TABLE "tasks"`);
      await queryRunner.query(`ALTER TABLE "tasks_old" RENAME TO "tasks"`);
    }
  }

  private async tableExists(queryRunner: QueryRunner): Promise<boolean> {
    const driver = queryRunner.connection.driver;
    const tableName = 'tasks';
    if (driver.options.type === 'better-sqlite3') {
      const result = await queryRunner.query(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
        [tableName],
      );
      return Array.isArray(result) && result.length > 0;
    }
    const result = await queryRunner.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = $1`,
      [tableName],
    );
    return Array.isArray(result) && result.length > 0;
  }

  private async hasColumn(
    queryRunner: QueryRunner,
    columnName: string,
  ): Promise<boolean> {
    const driver = queryRunner.connection.driver;
    if (driver.options.type === 'better-sqlite3') {
      const result = await queryRunner.query(`PRAGMA table_info(tasks)`);
      const rows = Array.isArray(result) ? result : [];
      return rows.some((r: { name: string }) => r.name === columnName);
    }
    const result = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = $1`,
      [columnName],
    );
    return Array.isArray(result) && result.length > 0;
  }

  private async migrateSQLite(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tasks_new" (
        "id" varchar PRIMARY KEY NOT NULL,
        "taskId" varchar NOT NULL,
        "description" text NOT NULL,
        "priority" varchar(10) NOT NULL,
        "dependencies" text NOT NULL,
        "status" varchar(20) DEFAULT 'Ready',
        "transcriptId" varchar NOT NULL,
        "createdAt" datetime DEFAULT (datetime('now')),
        CONSTRAINT "UQ_tasks_transcript_task" UNIQUE ("transcriptId", "taskId")
      )
    `);

    const rows = await queryRunner.query(`SELECT * FROM "tasks"`);
    for (const row of rows as Array<{
      id: string;
      description: string;
      priority: string;
      dependencies: string;
      status: string;
      transcriptId: string;
      createdAt: string;
    }>) {
      const newId = randomUUID();
      await queryRunner.query(
        `INSERT INTO "tasks_new" ("id", "taskId", "description", "priority", "dependencies", "status", "transcriptId", "createdAt")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newId,
          row.id,
          row.description,
          row.priority,
          row.dependencies,
          row.status ?? 'Ready',
          row.transcriptId,
          row.createdAt,
        ],
      );
    }

    await queryRunner.query(`DROP TABLE "tasks"`);
    await queryRunner.query(`ALTER TABLE "tasks_new" RENAME TO "tasks"`);
  }

  private async migratePostgres(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tasks_new" (
        "id" uuid PRIMARY KEY,
        "taskId" varchar NOT NULL,
        "description" text NOT NULL,
        "priority" varchar(10) NOT NULL,
        "dependencies" text NOT NULL,
        "status" varchar(20) DEFAULT 'Ready',
        "transcriptId" varchar NOT NULL,
        "createdAt" TIMESTAMP DEFAULT now(),
        CONSTRAINT "UQ_tasks_transcript_task" UNIQUE ("transcriptId", "taskId")
      )
    `);

    const rows = await queryRunner.query(`SELECT * FROM "tasks"`);
    for (const row of rows as Array<{
      id: string;
      description: string;
      priority: string;
      dependencies: string;
      status: string;
      transcriptId: string;
      createdAt: string;
    }>) {
      const newId = randomUUID();
      await queryRunner.query(
        `INSERT INTO "tasks_new" ("id", "taskId", "description", "priority", "dependencies", "status", "transcriptId", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          newId,
          row.id,
          row.description,
          row.priority,
          row.dependencies,
          row.status ?? 'Ready',
          row.transcriptId,
          row.createdAt,
        ],
      );
    }

    await queryRunner.query(`DROP TABLE "tasks"`);
    await queryRunner.query(`ALTER TABLE "tasks_new" RENAME TO "tasks"`);
  }
}
