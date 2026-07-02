import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      // We pass the URL here for Prisma 7 instead of the schema
      adapter: null,
      datasourceUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/orchestrator?schema=public',
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
