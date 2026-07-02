import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ServeStaticModule } from '@nestjs/serve-static';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { join } from 'path';
import { AppController } from './app.controller';
import { EventsController } from './events.controller';
import { CredentialsController } from './credentials.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { ExecutionProcessor } from './engine/execution.processor';
import Redis from 'ioredis';

const redisConnection: any = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
  : {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
    };

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', '..', 'ui', 'dist'),
      exclude: ['/api/(.*)'],
    }),
    BullModule.forRoot({
      connection: redisConnection,
    }),
    BullModule.registerQueue({
      name: 'workflow-executions',
    }),
  ],
  controllers: [AppController, EventsController, CredentialsController],
  providers: [
    AppService, 
    PrismaService, 
    ...(process.env.DISABLE_WORKERS === 'true' ? [] : [ExecutionProcessor])
  ],
})
export class AppModule {}
