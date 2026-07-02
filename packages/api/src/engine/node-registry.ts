import { ExpressionSandbox } from './sandbox';
import { WorkflowNode } from './workflow-runner';

export interface NodeExecutionData {
  json: any;
  binary?: Record<string, any>;
}

export interface NodeContext {
  $node: Record<string, NodeExecutionData>;
  $json: any;
  $workflow: any;
  $execution: any;
  $env: NodeJS.ProcessEnv;
  $credentials: Record<string, any>;
}

export interface INodeDefinition {
  type: string;
  category: 'trigger' | 'action' | 'logic' | 'data' | 'ai';
  execute: (node: WorkflowNode, context: NodeContext) => Promise<any>;
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

  static async executeNode(node: WorkflowNode, context: NodeContext): Promise<any> {
    const definition = this.getNode(node.type);
    if (!definition) {
      console.warn(`[NodeRegistry] Node type ${node.type} not registered. Passing data through.`);
      return context.$json;
    }

    if (definition.validate && !definition.validate(node)) {
      throw new Error(`Node validation failed for ${node.id} (${node.type})`);
    }

    // Resolve parameters before passing to the node's execute function
    const resolvedParams = ExpressionSandbox.resolveParameters(node.parameters || {}, context);
    
    // Create a shadow node with resolved parameters
    const resolvedNode = { ...node, parameters: resolvedParams };
    
    return await definition.execute(resolvedNode, context);
  }
}

// ==========================================
// REGISTER BUILT-IN NODES
// ==========================================

NodeRegistry.registerNode({
  type: 'Webhook',
  category: 'trigger',
  execute: async (node) => {
    return node.parameters.payload || { message: 'Webhook triggered' };
  }
});

NodeRegistry.registerNode({
  type: 'ManualTrigger',
  category: 'trigger',
  execute: async (node) => {
    return { message: 'Manual execution started' };
  }
});

NodeRegistry.registerNode({
  type: 'ScheduleTrigger',
  category: 'trigger',
  execute: async (node) => {
    return { timestamp: new Date().toISOString() };
  }
});

NodeRegistry.registerNode({
  type: 'Set',
  category: 'data',
  execute: async (node) => {
    try {
      return typeof node.parameters.value === 'string' ? JSON.parse(node.parameters.value) : node.parameters.value;
    } catch {
      return { value: node.parameters.value };
    }
  }
});

NodeRegistry.registerNode({
  type: 'HTTPRequest',
  category: 'action',
  execute: async (node) => {
    const method = node.parameters.method || 'GET';
    const url = node.parameters.url;
    
    if (!url) throw new Error('HTTP Request requires a URL');

    let body: string | undefined = undefined;
    if (['POST', 'PUT', 'PATCH'].includes(method) && node.parameters.body) {
      try {
        body = typeof node.parameters.body === 'string' ? node.parameters.body : JSON.stringify(node.parameters.body);
      } catch (e) {
        body = String(node.parameters.body);
      }
    }

    let headers: Record<string, string> = { 'Content-Type': 'application/json' };
    
    // Inject headers from custom parameters
    if (node.parameters.headers && typeof node.parameters.headers === 'object') {
      headers = { ...headers, ...node.parameters.headers };
    }

    // Inject Auth from Vault
    const credentialId = node.parameters.credentialId;
    if (credentialId && context.$credentials[credentialId]) {
      const cred = context.$credentials[credentialId];
      if (cred.apiKey) {
        // Simple Bearer strategy for generic APIs
        headers['Authorization'] = `Bearer ${cred.apiKey}`;
      }
    }

    const response = await fetch(url, {
      method,
      headers,
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
  }
});

NodeRegistry.registerNode({
  type: 'IF',
  category: 'logic',
  execute: async (node) => {
    const condition = node.parameters.condition;
    let result = false;
    try {
      result = condition === true || condition === 'true';
    } catch (e) {}
    return { result };
  }
});

NodeRegistry.registerNode({
  type: 'Switch',
  category: 'logic',
  execute: async (node) => {
    return { matched: node.parameters.value };
  }
});

NodeRegistry.registerNode({
  type: 'Filter',
  category: 'logic',
  execute: async (node, context) => {
    const arr = Array.isArray(context.$json) ? context.$json : [context.$json];
    return arr.filter(item => {
      // In a real filter node, we would resolve conditions against each item,
      // but for this prototype we just evaluate a global boolean.
      return node.parameters.condition === true || node.parameters.condition === 'true';
    });
  }
});

NodeRegistry.registerNode({
  type: 'Transform',
  category: 'data',
  execute: async (node, context) => {
    // Basic map/transform stub
    return { transformed: context.$json };
  }
});

NodeRegistry.registerNode({
  type: 'AIAgent',
  category: 'ai',
  execute: async (node, context) => {
    const { AgentExecutor } = await import('./ai-agent.js');
    
    // Resolve credential based on node's selected credential ID
    const credentialId = node.parameters.credentialId;
    let apiKey = node.parameters.apiKey || 'mock-key';
    if (credentialId && context.$credentials[credentialId]) {
      apiKey = context.$credentials[credentialId].apiKey || apiKey;
    }

    const executor = new AgentExecutor(
      node.parameters.provider || 'openai',
      node.parameters.model || 'gpt-4',
      apiKey,
      []
    );
    return await executor.execute(node.parameters.prompt || 'Hello', context);
  }
});
