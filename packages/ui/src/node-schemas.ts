export interface INodePropertyOptions {
  name: string;
  value: string | number | boolean;
  description?: string;
}

export interface INodeProperties {
  displayName: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'options' | 'multiOptions' | 'collection' | 'fixedCollection' | 'json' | 'code' | 'credential' | 'resourceLocator' | 'notice' | 'dateTime' | 'color' | 'file' | 'expression' | 'messageBuilder' | 'conditionBuilder' | 'parameters';
  default: any;
  options?: INodePropertyOptions[];
  required?: boolean;
  description?: string;
  placeholder?: string;
  typeOptions?: {
    rows?: number;
    credentialTypes?: string[];
  };
  displayOptions?: {
    show?: Record<string, any[]>;
    hide?: Record<string, any[]>;
  };
}

export interface INodeSchema {
  name: string;
  displayName: string;
  description: string;
  properties: INodeProperties[];
}

export const NODE_SCHEMAS: Record<string, INodeSchema> = {
  Webhook: {
    name: 'Webhook',
    displayName: 'Webhook',
    description: 'Starts the workflow on a webhook call',
    properties: [
      {
        displayName: 'HTTP Method',
        name: 'method',
        type: 'options',
        options: [
          { name: 'GET', value: 'GET' },
          { name: 'POST', value: 'POST' },
          { name: 'PUT', value: 'PUT' },
          { name: 'PATCH', value: 'PATCH' },
          { name: 'DELETE', value: 'DELETE' }
        ],
        default: 'GET'
      },
      {
        displayName: 'Path',
        name: 'path',
        type: 'string',
        default: '',
        placeholder: 'my-webhook-path',
        description: 'The path to listen on.'
      }
    ]
  },
  Set: {
    name: 'Set',
    displayName: 'Set',
    description: 'Set values in the data',
    properties: [
      {
        displayName: 'Values (JSON)',
        name: 'value',
        type: 'json',
        default: '{\n  \n}',
        typeOptions: { rows: 8 }
      }
    ]
  },
  IF: {
    name: 'IF',
    displayName: 'IF',
    description: 'Conditionally route data',
    properties: [
      {
        displayName: 'Conditions',
        name: 'conditions',
        type: 'conditionBuilder',
        default: {}
      }
    ]
  },
  HTTPRequest: {
    name: 'HTTPRequest',
    displayName: 'HTTP Request',
    description: 'Make an HTTP Request',
    properties: [
      {
        displayName: 'Authentication',
        name: 'authentication',
        type: 'options',
        options: [
          { name: 'None', value: 'none' },
          { name: 'Generic Credential Type', value: 'genericCredentialType' }
        ],
        default: 'none'
      },
      {
        displayName: 'Credential',
        name: 'credentialId',
        type: 'credential',
        default: '',
        displayOptions: {
          show: { authentication: ['genericCredentialType'] }
        }
      },
      {
        displayName: 'Method',
        name: 'method',
        type: 'options',
        options: [
          { name: 'GET', value: 'GET' },
          { name: 'POST', value: 'POST' },
          { name: 'PUT', value: 'PUT' },
          { name: 'PATCH', value: 'PATCH' },
          { name: 'DELETE', value: 'DELETE' }
        ],
        default: 'GET'
      },
      {
        displayName: 'URL',
        name: 'url',
        type: 'string',
        default: '',
        required: true
      },
      {
        displayName: 'Body',
        name: 'body',
        type: 'json',
        default: '',
        displayOptions: {
          hide: { method: ['GET'] }
        }
      },
      {
        displayName: 'Headers (JSON)',
        name: 'headers',
        type: 'json',
        default: ''
      }
    ]
  },
  Anthropic: {
    name: 'Anthropic',
    displayName: 'Anthropic',
    description: 'Interact with Anthropic API',
    properties: [
      {
        displayName: 'Credential',
        name: 'credentialId',
        type: 'credential',
        typeOptions: { credentialTypes: ['Anthropic'] },
        default: ''
      },
      {
        displayName: 'Model',
        name: 'model',
        type: 'options',
        options: [
          { name: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20240620' },
          { name: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
          { name: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' }
        ],
        default: 'claude-3-5-sonnet-20240620'
      },
      {
        displayName: 'Messages',
        name: 'messages',
        type: 'messageBuilder',
        default: []
      },
      {
        displayName: 'System Prompt',
        name: 'systemPrompt',
        type: 'string',
        default: '',
        typeOptions: { rows: 4 }
      },
      {
        displayName: 'Max Tokens',
        name: 'maxTokens',
        type: 'number',
        default: 1024
      }
    ]
  },
  OpenAI: {
    name: 'OpenAI',
    displayName: 'OpenAI',
    description: 'Interact with OpenAI API',
    properties: [
      {
        displayName: 'Credential',
        name: 'credentialId',
        type: 'credential',
        typeOptions: { credentialTypes: ['OpenAI'] },
        default: ''
      },
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        options: [
          { name: 'Chat', value: 'chat' },
          { name: 'Completions', value: 'completions' }
        ],
        default: 'chat'
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        options: [
          { name: 'Create', value: 'create' }
        ],
        default: 'create'
      },
      {
        displayName: 'Model',
        name: 'model',
        type: 'options',
        options: [
          { name: 'GPT-4o', value: 'gpt-4o' },
          { name: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
          { name: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' }
        ],
        default: 'gpt-4o'
      },
      {
        displayName: 'Messages',
        name: 'messages',
        type: 'messageBuilder',
        default: [],
        displayOptions: {
          show: { resource: ['chat'] }
        }
      },
      {
        displayName: 'Prompt',
        name: 'prompt',
        type: 'string',
        default: '',
        displayOptions: {
          show: { resource: ['completions'] }
        },
        typeOptions: { rows: 4 }
      }
    ]
  },
  AIAgent: {
    name: 'AIAgent',
    displayName: 'AI Agent',
    description: 'Generic AI Agent Node',
    properties: [
      {
        displayName: 'Credential',
        name: 'credentialId',
        type: 'credential',
        default: ''
      },
      {
        displayName: 'Provider',
        name: 'provider',
        type: 'options',
        options: [
          { name: 'OpenAI', value: 'openai' },
          { name: 'Anthropic', value: 'anthropic' }
        ],
        default: 'openai'
      },
      {
        displayName: 'Model',
        name: 'model',
        type: 'string',
        default: 'gpt-4o'
      },
      {
        displayName: 'Prompt',
        name: 'prompt',
        type: 'string',
        typeOptions: { rows: 6 },
        default: '{{$json.body}}'
      }
    ]
  },
  Apify: {
    name: 'Apify',
    displayName: 'Apify',
    description: 'Run Apify Actors and Tasks',
    properties: [
      {
        displayName: 'Credential',
        name: 'credentialId',
        type: 'credential',
        typeOptions: { credentialTypes: ['Apify'] },
        default: ''
      },
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        options: [
          { name: 'Actor', value: 'actor' },
          { name: 'Task', value: 'task' }
        ],
        default: 'actor'
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        options: [
          { name: 'Run', value: 'run' }
        ],
        default: 'run'
      },
      {
        displayName: 'Actor ID',
        name: 'actorId',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['actor'] } }
      },
      {
        displayName: 'Input JSON',
        name: 'inputJson',
        type: 'json',
        default: '{\n  \n}',
        typeOptions: { rows: 6 }
      },
      {
        displayName: 'Memory (MB)',
        name: 'memory',
        type: 'options',
        options: [
          { name: '1024 MB', value: 1024 },
          { name: '2048 MB', value: 2048 },
          { name: '4096 MB', value: 4096 }
        ],
        default: 1024
      }
    ]
  }
};
