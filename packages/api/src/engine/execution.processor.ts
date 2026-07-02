import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkflowRunner } from './workflow-runner';
import { PrismaService } from '../prisma.service';

@Processor('workflow-executions')
export class ExecutionProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { executionId, nodes, connections, startingNodeId } = job.data;
    
    console.log(`[BullMQ Worker] Picked up execution job ${executionId}`);
    
    try {
      // Safely update execution status if it exists in DB
      const executionExists = await this.prisma.execution.findUnique({ where: { id: executionId } });
      if (executionExists) {
        await this.prisma.execution.update({
          where: { id: executionId },
          data: { status: 'running', startedAt: new Date() },
        });
      }

      // Initialize the engine
      const runner = new WorkflowRunner(nodes, connections, (type, payload) => {
        this.eventEmitter.emit('execution.event', { type, executionId, ...payload });
      });
      
      // Execute the DAG
      const finalState = await runner.execute(startingNodeId);
      
      // Mark as success
      if (executionExists) {
        await this.prisma.execution.update({
          where: { id: executionId },
          data: { 
            status: 'success', 
            executionData: finalState,
            stoppedAt: new Date() 
          },
        });
      }
      
      this.eventEmitter.emit('execution.event', { type: 'execution.completed', executionId, finalState });
      console.log(`[BullMQ Worker] Execution ${executionId} completed successfully.`);
      return finalState;

    } catch (error: any) {
      console.error(`[BullMQ Worker] Execution ${executionId} failed:`, error.message);
      
      this.eventEmitter.emit('execution.event', { type: 'execution.failed', executionId, error: error.message });
      
      // Mark as failed
      const executionExists = await this.prisma.execution.findUnique({ where: { id: executionId } });
      if (executionExists) {
        await this.prisma.execution.update({
          where: { id: executionId },
          data: { 
            status: 'failed', 
            executionData: { error: error.message },
            stoppedAt: new Date() 
          },
        });
      }
      
      throw error;
    }
  }
}
