import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
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

  @Get('workflows/:id')
  async getWorkflow(@Param('id') workflowId: string) {
    try {
      // Create if it doesn't exist for the prototype phase
      let workflow = await this.prisma.workflow.findUnique({
        where: { id: workflowId },
        include: { WorkflowVersion: { orderBy: { version: 'desc' }, take: 1 } }
      });
      
      if (!workflow) {
        // Create a default workspace first if none exists
        let workspace = await this.prisma.workspace.findFirst();
        if (!workspace) {
          let user = await this.prisma.user.findFirst();
          if (!user) {
            user = await this.prisma.user.create({ data: { id: 'default-user', email: 'admin@n7n.local', passwordHash: 'none' }});
          }
          const org = await this.prisma.organization.create({ data: { name: 'Zaggonaut Org', userId: user.id }});
          workspace = await this.prisma.workspace.create({ data: { name: 'Default Workspace', organizationId: org.id }});
        }

        workflow = await this.prisma.workflow.create({
          data: {
            id: workflowId,
            name: 'Default Workflow',
            workspaceId: workspace.id,
            WorkflowVersion: {
              create: {
                version: 1,
                nodes: [],
                connections: []
              }
            }
          },
          include: { WorkflowVersion: { orderBy: { version: 'desc' }, take: 1 } }
        });
      }
      return { status: 'success', data: workflow };
    } catch (e: any) {
      return { status: 'error', message: e.message };
    }
  }

  @Put('workflows/:id')
  async updateWorkflow(@Param('id') workflowId: string, @Body() body: any) {
    try {
      const { nodes, connections } = body;
      
      // We just push a new version for simplicity
      const newVersion = await this.prisma.workflowVersion.create({
        data: {
          workflowId,
          version: Date.now(), // simple auto-increment for prototype
          nodes,
          connections
        }
      });
      
      return { status: 'success', data: newVersion };
    } catch (e: any) {
      return { status: 'error', message: e.message };
    }
  }

  @Get('workflows/:id/executions')
  async getWorkflowExecutions(@Param('id') workflowId: string) {
    try {
      const workflow = await this.prisma.workflow.findUnique({
        where: { id: workflowId },
        include: { WorkflowVersion: true }
      });
      if (!workflow) return { status: 'error', message: 'Workflow not found' };

      const versionIds = workflow.WorkflowVersion.map(v => v.id);
      const executions = await this.prisma.execution.findMany({
        where: { workflowVersionId: { in: versionIds } },
        orderBy: { startedAt: 'desc' },
        take: 50 // Limit to last 50 for the prototype
      });

      return { status: 'success', data: executions };
    } catch (e: any) {
      return { status: 'error', message: e.message };
    }
  }

  @Post('workflows/:id/execute')
  async executeWorkflow(@Param('id') workflowId: string, @Body() body: any) {
    const { startingNodeId, mode = 'manual', nodes, connections } = body;

    // Create execution record
    let versionId: string | null = null;
    try {
      const workflow = await this.prisma.workflow.findUnique({
        where: { id: workflowId },
        include: { WorkflowVersion: { orderBy: { version: 'desc' }, take: 1 } }
      });
      if (workflow && workflow.WorkflowVersion.length > 0) {
        versionId = workflow.WorkflowVersion[0].id;
      }
    } catch (e) {}

    let executionId = `exec-${Date.now()}`;
    if (versionId) {
      const execution = await this.prisma.execution.create({
        data: {
          id: executionId,
          workflowVersionId: versionId,
          status: 'queued',
          mode
        }
      });
      executionId = execution.id;
    }

    // Dispatch job to Redis queue
    const job = await this.executionQueue.add('execute-workflow', {
      executionId: executionId,
      nodes: nodes,
      connections: connections,
      startingNodeId: startingNodeId,
    });

    return { 
      status: 'queued', 
      executionId: job.data.executionId,
      message: 'Workflow execution dispatched to background workers successfully'
    };
  }

  @Post('webhook/:workflowId')
  async webhookTrigger(@Param('workflowId') workflowId: string, @Body() body: any) {
    try {
      const workflow = await this.prisma.workflow.findUnique({
        where: { id: workflowId },
        include: { WorkflowVersion: { orderBy: { version: 'desc' }, take: 1 } }
      });

      if (!workflow || workflow.WorkflowVersion.length === 0) {
        return { status: 'error', message: 'Workflow not found or has no versions' };
      }

      const latestVersion = workflow.WorkflowVersion[0];
      const nodes = latestVersion.nodes as any[];
      const connections = latestVersion.connections as any[];
      
      const triggerNode = nodes.find(n => n.type === 'Webhook' || n.data?.type === 'Webhook');
      if (!triggerNode) {
        return { status: 'error', message: 'No webhook trigger found in this workflow' };
      }

      // Inject the payload into the webhook node's output somehow, or just pass it as start context
      // For now, we execute from the trigger node
      const execution = await this.prisma.execution.create({
        data: {
          workflowVersionId: latestVersion.id,
          status: 'queued',
          mode: 'webhook'
        }
      });

      // We should ideally inject the webhook body into the execution engine context here
      // We will do that by modifying the trigger node's parameters temporarily
      const triggerNodeIndex = nodes.findIndex(n => n.id === triggerNode.id);
      nodes[triggerNodeIndex] = {
        ...nodes[triggerNodeIndex],
        parameters: {
          ...(nodes[triggerNodeIndex].parameters || {}),
          payload: body
        }
      };

      const job = await this.executionQueue.add('execute-workflow', {
        executionId: execution.id,
        nodes: nodes,
        connections: connections,
        startingNodeId: triggerNode.id,
      });

      return { status: 'queued', executionId: execution.id };
    } catch (e: any) {
      return { status: 'error', message: e.message };
    }
  }
}
