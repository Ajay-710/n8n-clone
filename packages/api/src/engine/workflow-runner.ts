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

export class WorkflowRunner {
  private executionData: Record<string, any> = {};
  
  constructor(
    private nodes: WorkflowNode[],
    private connections: WorkflowConnection[],
    private onEvent?: (type: string, data: any) => void
  ) {}

  /**
   * Executes the workflow starting from a specific node
   */
  async execute(startNodeId: string) {
    const node = this.nodes.find(n => n.id === startNodeId);
    if (!node) throw new Error(`Node ${startNodeId} not found`);

    console.log(`[Engine] Starting execution at node: ${node.type} (${node.id})`);
    
    this.onEvent?.('node.started', { nodeId: node.id });
    
    // Artificial delay for UI visual feedback during rapid execution
    await new Promise(r => setTimeout(r, 600));

    try {
      // Process current node
      const result = await this.executeNode(node);
      
      // Save output data for future nodes to reference via {{$node["Id"].json}}
      this.executionData[node.id] = { json: result };
      
      this.onEvent?.('node.completed', { nodeId: node.id, output: result });

      // Find next nodes in the DAG
      const nextConnections = this.connections.filter(c => c.source === node.id);
      
      for (const conn of nextConnections) {
        console.log(`[Engine] Transitioning from ${node.id} -> ${conn.target}`);
        await this.execute(conn.target);
      }
    } catch (error: any) {
      this.onEvent?.('node.failed', { nodeId: node.id, error: error.message });
      throw error;
    }

    return this.executionData;
  }

  private async executeNode(node: WorkflowNode): Promise<any> {
    const { NodeRegistry } = await import('./node-registry.js');

    // Context available for this node's expressions
    const context = {
      $node: this.executionData,
      $json: this.getLastNodeData(),
      $workflow: { id: 'current-workflow' }, // Placeholder for real workflow execution context
      $execution: { id: 'current-execution' }, // Placeholder
      $env: process.env,
    };

    return await NodeRegistry.executeNode(node, context as any);
  }

  /**
   * Helper to get the most recent node's output data for {{$json}}
   */
  private getLastNodeData() {
    const keys = Object.keys(this.executionData);
    if (keys.length === 0) return {};
    return this.executionData[keys[keys.length - 1]].json;
  }
}
