import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('InsightBoard API (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /transcript/process returns transcriptId and tasks', () => {
    return request(app.getHttpServer())
      .post('/transcript/process')
      .send({ transcript: 'Action: Review docs. Action: Deploy.' })
      .expect(201)
      .expect((res) => {
        expect(res.body.transcriptId).toBeDefined();
        expect(Array.isArray(res.body.tasks)).toBe(true);
      });
  });

  it('POST /jobs returns jobId', () => {
    return request(app.getHttpServer())
      .post('/jobs')
      .send({ transcript: 'Action: Task one.' })
      .expect(201)
      .expect((res) => {
        expect(res.body.jobId).toBeDefined();
        expect(res.body.status).toBeDefined();
      });
  });
});
