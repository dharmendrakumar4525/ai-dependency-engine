import { MigrationInterface, QueryRunner } from 'typeorm';

export class JobErrorFields1738637000000 implements MigrationInterface {
  name = 'JobErrorFields1738637000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasCol = await this.hasColumn(queryRunner, 'errorMessage');
    if (hasCol) return;
    await queryRunner.query(`ALTER TABLE "jobs" ADD COLUMN "errorMessage" text`);
    await queryRunner.query(`ALTER TABLE "jobs" ADD COLUMN "errorCode" varchar(50)`);
  }

  private async hasColumn(queryRunner: QueryRunner, name: string): Promise<boolean> {
    const driver = queryRunner.connection.driver;
    if (driver.options.type === 'better-sqlite3') {
      const r = await queryRunner.query(`PRAGMA table_info(jobs)`);
      return (Array.isArray(r) ? r : []).some((x: { name: string }) => x.name === name);
    }
    const r = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name=$1`,
      [name],
    );
    return Array.isArray(r) && r.length > 0;
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isSQLite = queryRunner.connection.driver.options.type === 'better-sqlite3';
    if (isSQLite) {
      // SQLite doesn't support DROP COLUMN easily
      return;
    }
    await queryRunner.query(`ALTER TABLE "jobs" DROP COLUMN "errorMessage"`);
    await queryRunner.query(`ALTER TABLE "jobs" DROP COLUMN "errorCode"`);
  }
}
