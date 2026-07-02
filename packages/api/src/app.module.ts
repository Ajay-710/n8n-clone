import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { ExecutionProcessor } from './engine/execution.processor';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'ui', 'dist'),
      exclude: ['/api/(.*)'],
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    BullModule.registerQueue({
      name: 'workflow-executions',
    }),
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService, ExecutionProcessor],
})
export class AppModule {}
