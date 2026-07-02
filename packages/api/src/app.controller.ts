import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';

@Controller('api/v1')
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
    @InjectQueue('workflow-executions') private readonly executionQueue: Queue
  ) {}

  @Get('health')
  async getHealth() {
    try {
      // Verify PostgreSQL
      await this.prisma.$queryRawUnsafe('SELECT 1');
      
      // Verify Redis/BullMQ
      const redisClient = await this.executionQueue.client;
      await (redisClient as any).ping();

      return { 
        status: 'ok', 
        database: 'connected', 
        redis: 'connected',
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return { 
        status: 'error', 
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Get('workflows')
  async getWorkflows() {
    try {
      const workflows = await this.prisma.workflow.findMany();
      return { status: 'success', data: workflows };
    } catch (e) {
      return { 
        status: 'mock_fallback',
        data: [
          { id: '1', name: 'Lead Qualification Workflow', active: true },
          { id: '2', name: 'Slack Notification Sync', active: false }
        ]
      };
    }
  }

  @Post('workflows/:id/execute')
  async executeWorkflow(@Param('id') workflowId: string, @Body() body: any) {
    const { startingNodeId, mode = 'manual' } = body;
    
    // In production, fetch nodes and connections from the database using the workflowId
    // For this prototype phase, we will mock the DAG structure if the DB is unavailable
    const mockNodes = [
      { id: 'node-1', type: 'Webhook', parameters: {} },
      { id: 'node-2', type: 'Set', parameters: { text: 'Hello Zaggonaut!' } }
    ];
    const mockConnections = [{ source: 'node-1', target: 'node-2' }];

    // Dispatch job to Redis queue
    const job = await this.executionQueue.add('execute-workflow', {
      executionId: `exec-${Date.now()}`,
      nodes: mockNodes,
      connections: mockConnections,
      startingNodeId: startingNodeId || 'node-1',
    });

    return { 
      status: 'queued', 
      executionId: job.data.executionId,
      message: 'Workflow execution dispatched to background workers successfully'
    };
  }
}
