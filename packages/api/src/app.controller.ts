import { Controller, Get, Post, Put, Delete, Body, Param, All, Req } from '@nestjs/common';

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
      const { name, nodes, connections } = body;
      
      if (name) {
        await this.prisma.workflow.update({
          where: { id: workflowId },
          data: { name }
        });
      }

      const latestVersion = await this.prisma.workflowVersion.findFirst({
        where: { workflowId },
        orderBy: { version: 'desc' }
      });
      
      const newVersion = await this.prisma.workflowVersion.create({
        data: {
          workflowId,
          version: latestVersion ? latestVersion.version + 1 : 1,
          nodes,
          connections
        }
      });
      
      return { status: 'success', data: newVersion };
    } catch (e: any) {
      return { status: 'error', message: e.message };
    }
  }

  @Delete('workflows/:id')
  async deleteWorkflow(@Param('id') workflowId: string) {
    try {
      // Find all versions of this workflow
      const versions = await this.prisma.workflowVersion.findMany({ where: { workflowId } });
      const versionIds = versions.map(v => v.id);
      
      // Cascade delete executions
      if (versionIds.length > 0) {
        await this.prisma.execution.deleteMany({ where: { workflowVersionId: { in: versionIds } } });
      }
      
      // Cascade delete versions
      await this.prisma.workflowVersion.deleteMany({ where: { workflowId } });
      
      // Delete workflow
      await this.prisma.workflow.delete({ where: { id: workflowId } });
      
      return { status: 'success' };
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
        include: { workflowVersion: true },
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

    const job = await this.executionQueue.add('execute-workflow', {
      executionId: executionId,
      nodes: nodes,
      connections: connections,
      startingNodeId: startingNodeId,
      mode: mode
    });

    return { 
      status: 'queued', 
      executionId: job.data.executionId,
      message: 'Workflow execution dispatched to background workers successfully'
    };
  }

  @All('webhook/:path(*)')
  async handleDynamicWebhook(@Param('path') path: string, @Req() req: any, @Body() body: any) {
    try {
      const workflows = await this.prisma.workflow.findMany({
        where: { active: true },
        include: { WorkflowVersion: { orderBy: { version: 'desc' }, take: 1 } }
      });
      // Fallback for MVP: if no active workflows match, check inactive ones (since activate toggle might be unimplemented)
      const allWorkflows = workflows.length > 0 ? workflows : await this.prisma.workflow.findMany({
        include: { WorkflowVersion: { orderBy: { version: 'desc' }, take: 1 } }
      });

      let targetWorkflowVersionId: string | null = null;
      let targetNodes: any[] = [];
      let targetConnections: any[] = [];
      let startingNodeId: string | null = null;
      let matchedNode: any = null;

      for (const w of allWorkflows) {
        if (w.WorkflowVersion.length > 0) {
          const v = w.WorkflowVersion[0];
          const nodes = v.nodes as any[];
          
          const webhookNode = nodes.find(n => 
            (n.type === 'Webhook' || n.data?.type === 'Webhook') && 
            (n.data?.parameters?.path === path || n.parameters?.path === path)
          );

          if (webhookNode) {
            // Check method match (default GET/POST)
            const expectedMethod = (webhookNode.data?.parameters?.method || webhookNode.parameters?.method || 'GET').toUpperCase();
            if (expectedMethod !== req.method) {
               return { status: 'error', message: `Webhook method mismatch. Expected ${expectedMethod}, got ${req.method}` };
            }

            targetWorkflowVersionId = v.id;
            targetNodes = nodes;
            targetConnections = v.connections as any[];
            startingNodeId = webhookNode.id;
            matchedNode = webhookNode;
            break;
          }
        }
      }

      if (!targetWorkflowVersionId) {
        return { status: 'error', message: `No workflow registered for webhook path: ${path}` };
      }

      const executionId = `exec-${Date.now()}`;
      const execution = await this.prisma.execution.create({
        data: {
          id: executionId,
          workflowVersionId: targetWorkflowVersionId,
          status: 'queued',
          mode: 'webhook'
        }
      });

      // Pass the webhook payload (query string for GET, body for POST) as the trigger data
      const webhookPayload = req.method === 'GET' ? req.query : body;
      
      const job = await this.executionQueue.add('execute-workflow', {
        executionId: execution.id,
        nodes: targetNodes,
        connections: targetConnections,
        startingNodeId: startingNodeId,
        mode: 'webhook',
        triggerPayload: webhookPayload
      });

      return { 
        status: 'queued', 
        executionId: execution.id,
        message: 'Webhook processed successfully'
      };
    } catch (e: any) {
      return { status: 'error', message: e.message };
    }
  }


}
