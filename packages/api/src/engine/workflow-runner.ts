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
    private connections: WorkflowConnection[]
  ) {}

  /**
   * Executes the workflow starting from a specific node
   */
  async execute(startNodeId: string) {
    const node = this.nodes.find(n => n.id === startNodeId);
    if (!node) throw new Error(`Node ${startNodeId} not found`);

    console.log(`[Engine] Starting execution at node: ${node.type} (${node.id})`);
    
    // Process current node
    const result = await this.executeNode(node);
    
    // Save output data for future nodes to reference via {{$node["Id"].json}}
    this.executionData[node.id] = { json: result };

    // Find next nodes in the DAG
    const nextConnections = this.connections.filter(c => c.source === node.id);
    
    for (const conn of nextConnections) {
      console.log(`[Engine] Transitioning from ${node.id} -> ${conn.target}`);
      await this.execute(conn.target);
    }

    return this.executionData;
  }

  private async executeNode(node: WorkflowNode): Promise<any> {
    // Context available for this node's expressions
    const context = {
      $node: this.executionData,
      $json: this.getLastNodeData(),
    };

    // Resolve any {{ }} expressions in the node parameters before running
    const resolvedParams = ExpressionSandbox.resolveParameters(node.parameters || {}, context);

    switch (node.type) {
      case 'Webhook':
      case 'ManualTrigger':
        // The trigger payload is injected into parameters by the controller
        return resolvedParams.payload || { message: 'Triggered successfully' };
        
      case 'Set':
        // Try to parse the text as JSON, or return as string
        try {
          return typeof resolvedParams.value === 'string' ? JSON.parse(resolvedParams.value) : resolvedParams.value;
        } catch {
          return { value: resolvedParams.value };
        }
        
      case 'HTTPRequest':
        console.log(`[Engine] Executing real HTTP Request to ${resolvedParams.url}`);
        const method = resolvedParams.method || 'GET';
        let body: string | undefined = undefined;
        
        if (['POST', 'PUT', 'PATCH'].includes(method) && resolvedParams.body) {
          try {
            body = typeof resolvedParams.body === 'string' ? resolvedParams.body : JSON.stringify(resolvedParams.body);
          } catch (e) {
            body = String(resolvedParams.body);
          }
        }

        try {
          const response = await fetch(resolvedParams.url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body
          });
          
          let responseBody;
          try {
            responseBody = await response.json();
          } catch {
            responseBody = await response.text();
          }

          return { 
            status: response.status, 
            ok: response.ok, 
            body: responseBody 
          };
        } catch (error: any) {
          return { 
            error: error.message,
            stack: error.stack
          };
        }
        
      case 'IF':
        console.log(`[Engine] Evaluating condition: ${resolvedParams.condition}`);
        let result = false;
        try {
          // If condition is e.g. "true" or evaluated to a boolean
          result = resolvedParams.condition === true || resolvedParams.condition === 'true';
        } catch (e) {}
        return { result };

      case 'AIAgent':
        console.log(`[Engine] Initializing AI Agent: ${resolvedParams.model}`);
        // Fetch connected tools from the DAG (nodes pointing to this agent with type 'Tool')
        const toolConnections = this.connections.filter(c => c.target === node.id);
        const toolNodes = toolConnections.map(c => this.nodes.find(n => n.id === c.source && n.type === 'Tool')).filter(Boolean);
        const { AgentExecutor } = await import('./ai-agent.js');
        const executor = new AgentExecutor(
          resolvedParams.provider || 'openai',
          resolvedParams.model || 'gpt-4',
          resolvedParams.apiKey || 'mock-key',
          toolNodes.map(t => ({
            name: t!.parameters.name,
            description: t!.parameters.description,
            schema: {},
            handler: async (args) => ({ success: true, executed: t!.parameters.name, args })
          }))
        );
        
        return await executor.execute(resolvedParams.prompt || 'Hello', context);

      case 'ExecuteWorkflow':
        console.log(`[Engine] Triggering Sub-Workflow ID: ${resolvedParams.workflowId}`);
        return { subWorkflowResult: 'Completed successfully', executionId: `sub-${Date.now()}` };

      default:
        console.log(`[Engine] Unknown node type: ${node.type}. Passing data through.`);
        return context.$json;
    }
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
