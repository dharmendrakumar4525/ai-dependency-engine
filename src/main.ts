import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import multer from 'multer';
import { AppModule } from './app.module';

const transcriptPaths = ['/transcript/process', '/jobs'];
const isTranscriptPost = (req: express.Request) =>
  req.method === 'POST' &&
  transcriptPaths.some((p) => req.path === p || req.path.endsWith(p));

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  }).single('transcript');

  app.use(
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (!isTranscriptPost(req)) return next();
      const ct = (req.headers['content-type'] || '').toLowerCase();
      if (ct.includes('multipart/form-data')) {
        return upload(req, res, (err) => {
          if (err) return next(err);
          next();
        });
      }
      return express.raw({ limit: '10mb' })(req, res, (err) => {
        if (err) return next(err);
        const raw = req.body;
        if (Buffer.isBuffer(raw)) {
          const str = raw.toString('utf8');
          const trimmed = str.trim();
          if (trimmed.startsWith('{')) {
            try {
              req.body = JSON.parse(str);
            } catch {
              req.body = str;
            }
          } else if (trimmed.startsWith('"') && trimmed.length >= 2) {
            try {
              const parsed = JSON.parse(str);
              if (typeof parsed === 'string') req.body = parsed;
              else req.body = str;
            } catch {
              req.body = str;
            }
          } else {
            req.body = str;
          }
        }
        next();
      });
    },
  );
  app.use(
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (isTranscriptPost(req)) return next();
      express.json({ limit: '10mb' })(req, res, next);
    },
  );
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('InsightBoard Dependency Engine')
    .setDescription(
      'Converts meeting transcripts into a structured task dependency graph.',
    )
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
