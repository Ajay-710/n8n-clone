import { ExpressionSandbox } from './sandbox';

export interface WorkflowNode {
  id: string;
  type: string;
  parameters: Record<string, any>;
}

export interface WorkflowConnection {
  source: string;
  target: string;
}

export interface INodeExecutionData {
  json: Record<string, any>;
}

export class WorkflowRunner {
  // Stores the output arrays for each node
  private executionData: Record<string, INodeExecutionData[]> = {};
  
  constructor(
    private nodes: WorkflowNode[],
    private connections: WorkflowConnection[],
    private onEvent?: (type: string, data: any) => void,
    private credentials: Record<string, any> = {}
  ) {}

  /**
   * Executes the entire workflow graph using a BFS/Queue traversal.
   * Ensures nodes with multiple inputs wait for all dependencies before running.
   */
  async execute(startNodeId: string) {
    const queue = [startNodeId];
    
    // Track execution status of nodes
    const nodeStatus: Record<string, 'pending' | 'completed' | 'failed'> = {};
    this.nodes.forEach(n => nodeStatus[n.id] = 'pending');

    // Artificial delay to simulate initialization
    await new Promise(r => setTimeout(r, 600));

    // Initially inject a single empty item for the trigger node
    this.executionData['trigger_init'] = [{ json: {} }];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (nodeStatus[nodeId] === 'completed' || nodeStatus[nodeId] === 'failed') continue;

      const node = this.nodes.find(n => n.id === nodeId);
      if (!node) continue;

      // Check if all incoming connections have completed. If not, put back in queue.
      const incomingConns = this.connections.filter(c => c.target === nodeId);
      const allIncomingCompleted = incomingConns.every(c => nodeStatus[c.source] === 'completed');
      
      if (!allIncomingCompleted && incomingConns.length > 0) {
        // We must wait for upstream nodes to finish
        continue;
      }

      console.log(`[Engine] Executing node: ${node.type} (${node.id})`);
      this.onEvent?.('node.started', { nodeId: node.id });

      try {
        // Collect inputs from all incoming edges (Merge them)
        let inputData: INodeExecutionData[] = [];
        if (incomingConns.length === 0) {
          // It's a trigger or first node
          inputData = [{ json: {} }];
        } else {
          // Merge arrays of items from all incoming connections
          for (const conn of incomingConns) {
            if (this.executionData[conn.source]) {
              inputData = inputData.concat(this.executionData[conn.source]);
            }
          }
        }

        // Process node
        const result = await this.executeNode(node, inputData);
        
        // Save output data array
        this.executionData[node.id] = result;
        nodeStatus[node.id] = 'completed';
        
        this.onEvent?.('node.completed', { nodeId: node.id, output: result });

        // Add downstream nodes to queue
        const nextConns = this.connections.filter(c => c.source === node.id);
        for (const conn of nextConns) {
          if (!queue.includes(conn.target) && nodeStatus[conn.target] === 'pending') {
            queue.push(conn.target);
          }
        }

      } catch (error: any) {
        nodeStatus[node.id] = 'failed';
        this.onEvent?.('node.failed', { nodeId: node.id, error: error.message });
        
        // If "Continue On Fail" is checked, we don't throw. (Placeholder for future)
        throw error;
      }
    }

    return this.executionData;
  }

  private async executeNode(node: WorkflowNode, inputData: INodeExecutionData[]): Promise<INodeExecutionData[]> {
    const { NodeRegistry } = await import('./node-registry.js');

    // Context available for this node's expressions
    const context = {
      $node: this.executionData,
      $workflow: { id: 'current-workflow' }, 
      $execution: { id: 'current-execution' }, 
      $env: process.env,
      $credentials: this.credentials,
    };

    return await NodeRegistry.executeNode(node, inputData, context as any);
  }
}
