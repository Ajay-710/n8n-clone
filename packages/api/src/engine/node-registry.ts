import { ExpressionSandbox } from './sandbox';
import { WorkflowNode, INodeExecutionData } from './workflow-runner';

export interface NodeContext {
  $node: Record<string, INodeExecutionData[]>;
  $workflow: any;
  $execution: any;
  $env: NodeJS.ProcessEnv;
  $credentials: Record<string, any>;
}

export interface INodeDefinition {
  type: string;
  category: 'trigger' | 'action' | 'logic' | 'data' | 'ai';
  execute: (node: WorkflowNode, inputData: INodeExecutionData[], context: NodeContext) => Promise<INodeExecutionData[]>;
  validate?: (node: WorkflowNode) => boolean;
}

export class NodeRegistry {
  private static nodes = new Map<string, INodeDefinition>();

  static registerNode(definition: INodeDefinition) {
    this.nodes.set(definition.type, definition);
  }

  static getNode(type: string): INodeDefinition | undefined {
    return this.nodes.get(type);
  }

  static async executeNode(node: WorkflowNode, inputData: INodeExecutionData[], context: NodeContext): Promise<INodeExecutionData[]> {
    const definition = this.getNode(node.type);
    if (!definition) {
      console.warn(`[NodeRegistry] Node type ${node.type} not registered. Passing data through.`);
      return inputData;
    }

    if (definition.validate && !definition.validate(node)) {
      throw new Error(`Node validation failed for ${node.id} (${node.type})`);
    }

    return await definition.execute(node, inputData, context);
  }
  
  /**
   * Helper to resolve parameters for a specific item index
   */
  static resolveItemParameters(node: WorkflowNode, itemIndex: number, inputData: INodeExecutionData[], context: NodeContext): Record<string, any> {
    const itemContext = {
      ...context,
      $json: inputData[itemIndex]?.json || {}
    };
    return ExpressionSandbox.resolveParameters(node.parameters || {}, itemContext);
  }
}

// ==========================================
// REGISTER BUILT-IN NODES
// ==========================================

NodeRegistry.registerNode({
  type: 'Webhook',
  category: 'trigger',
  execute: async (node, inputData, context) => {
    const params = NodeRegistry.resolveItemParameters(node, 0, inputData, context);
    return [{ json: params.payload || { message: 'Webhook triggered' } }];
  }
});

NodeRegistry.registerNode({
  type: 'ManualTrigger',
  category: 'trigger',
  execute: async () => {
    return [{ json: { message: 'Manual execution started' } }];
  }
});

NodeRegistry.registerNode({
  type: 'ScheduleTrigger',
  category: 'trigger',
  execute: async () => {
    return [{ json: { timestamp: new Date().toISOString() } }];
  }
});

NodeRegistry.registerNode({
  type: 'Set',
  category: 'data',
  execute: async (node, inputData, context) => {
    const outputData: INodeExecutionData[] = [];
    
    // Implicit Looping: Execute for each item
    for (let i = 0; i < inputData.length; i++) {
      const params = NodeRegistry.resolveItemParameters(node, i, inputData, context);
      let value = params.value;
      try {
        if (typeof value === 'string') {
          value = JSON.parse(value);
        }
      } catch {}
      outputData.push({ json: typeof value === 'object' ? value : { value } });
    }
    return outputData;
  }
});

NodeRegistry.registerNode({
  type: 'HTTPRequest',
  category: 'action',
  execute: async (node, inputData, context) => {
    const outputData: INodeExecutionData[] = [];

    // Implicit Looping: Execute for each item
    for (let i = 0; i < (inputData.length || 1); i++) {
      const params = NodeRegistry.resolveItemParameters(node, i, inputData, context);
      
      const method = params.method || 'GET';
      const url = params.url;
      
      if (!url) throw new Error('HTTP Request requires a URL');

      let body: string | undefined = undefined;
      if (['POST', 'PUT', 'PATCH'].includes(method) && params.body) {
        try {
          body = typeof params.body === 'string' ? params.body : JSON.stringify(params.body);
        } catch (e) {
          body = String(params.body);
        }
      }

      let headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (params.headers && typeof params.headers === 'object') {
        headers = { ...headers, ...params.headers };
      }

      const credentialId = params.credentialId;
      if (credentialId && context.$credentials[credentialId]) {
        const cred = context.$credentials[credentialId];
        if (cred.apiKey) {
          headers['Authorization'] = `Bearer ${cred.apiKey}`;
        }
      }

      const response = await fetch(url, { method, headers, body });
      
      let responseBody;
      try {
        responseBody = await response.json();
      } catch {
        responseBody = await response.text();
      }

      outputData.push({ json: { status: response.status, ok: response.ok, body: responseBody } });
    }
    
    return outputData;
  }
});

NodeRegistry.registerNode({
  type: 'IF',
  category: 'logic',
  execute: async (node, inputData, context) => {
    const outputData: INodeExecutionData[] = [];
    
    // In a real n8n IF node, data routes to true/false paths.
    // For now, we simply attach a "result" boolean to each item.
    for (let i = 0; i < inputData.length; i++) {
      const params = NodeRegistry.resolveItemParameters(node, i, inputData, context);
      let result = false;
      try {
        result = params.condition === true || params.condition === 'true';
      } catch (e) {}
      outputData.push({ json: { ...inputData[i].json, matched: result } });
    }
    
    return outputData;
  }
});

NodeRegistry.registerNode({
  type: 'Filter',
  category: 'logic',
  execute: async (node, inputData, context) => {
    const outputData: INodeExecutionData[] = [];
    
    for (let i = 0; i < inputData.length; i++) {
      const params = NodeRegistry.resolveItemParameters(node, i, inputData, context);
      if (params.condition === true || params.condition === 'true') {
        outputData.push(inputData[i]);
      }
    }
    return outputData;
  }
});

NodeRegistry.registerNode({
  type: 'AIAgent',
  category: 'ai',
  execute: async (node, inputData, context) => {
    const { AgentExecutor } = await import('./ai-agent.js');
    const outputData: import('./workflow-runner.js').INodeExecutionData[] = [];
    
    for (let i = 0; i < inputData.length; i++) {
      const params = NodeRegistry.resolveItemParameters(node, i, inputData, context);
      
      const credentialId = params.credentialId;
      let apiKey = params.apiKey || 'mock-key';
      if (credentialId && context.$credentials[credentialId]) {
        apiKey = context.$credentials[credentialId].apiKey || apiKey;
      }

      const executor = new AgentExecutor(
        params.provider || 'openai',
        params.model || 'gpt-4',
        apiKey,
        []
      );
      
      const res = await executor.execute(params.prompt || 'Hello', { ...context, $json: inputData[i]?.json });
      outputData.push({ json: res });
    }
    
    return outputData;
  }
});

const executeSimpleLLM = async (provider: string, node: any, inputData: any[], context: any) => {
  const { AgentExecutor } = await import('./ai-agent.js');
  const outputData: import('./workflow-runner.js').INodeExecutionData[] = [];
  
  for (let i = 0; i < (inputData.length || 1); i++) {
    const params = NodeRegistry.resolveItemParameters(node, i, inputData, context);
    
    const credentialId = params.credentialId;
    let apiKey = params.apiKey || 'mock-key';
    if (credentialId && context.$credentials[credentialId]) {
      // Handle the nested structure of credential data
      apiKey = context.$credentials[credentialId].data?.apiKey || apiKey;
    }

    const executor = new AgentExecutor(
      provider,
      params.model || (provider === 'openai' ? 'gpt-4' : 'claude-3-opus-20240229'),
      apiKey,
      []
    );
    
    const prompt = params.prompt || 'Say hello!';
    const res = await executor.execute(prompt, { ...context, $json: inputData[i]?.json });
    outputData.push({ json: res });
  }
  return outputData;
};

NodeRegistry.registerNode({
  type: 'Anthropic',
  category: 'ai',
  execute: async (node, inputData, context) => executeSimpleLLM('anthropic', node, inputData, context)
});

NodeRegistry.registerNode({
  type: 'OpenAI',
  category: 'ai',
  execute: async (node, inputData, context) => executeSimpleLLM('openai', node, inputData, context)
});
