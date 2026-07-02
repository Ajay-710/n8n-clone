import { ExpressionSandbox } from './sandbox';

export interface ToolDefinition {
  name: string;
  description: string;
  schema: Record<string, any>;
  handler: (args: Record<string, any>) => Promise<any>;
}

export class AgentExecutor {
  constructor(
    private readonly provider: string,
    private readonly model: string,
    private readonly apiKey: string,
    private readonly tools: ToolDefinition[]
  ) {}

  /**
   * Executes the AI Agent loop (Reason -> Act -> Observe)
   */
  async execute(prompt: string, contextData: Record<string, any>): Promise<any> {
    console.log(`[AI Agent] Executing ${this.provider}/${this.model}`);
    
    const memory = contextData.$memory || [];
    memory.push({ role: 'user', content: prompt });

    if (this.apiKey === 'mock-key' || !this.apiKey) {
      return {
        response: `[MOCK MODE - NO API KEY] Generated response from ${this.provider} model for prompt: "${prompt}"`,
        toolsUsed: [],
        memory: [...memory, { role: 'assistant', content: 'Final response' }]
      };
    }

    try {
      if (this.provider.toLowerCase() === 'anthropic') {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: this.model || 'claude-3-opus-20240229',
            max_tokens: 1024,
            messages: memory.map((m: any) => ({ role: m.role, content: m.content }))
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Anthropic API error');
        
        const responseText = data.content[0]?.text || '';
        return {
          response: responseText,
          memory: [...memory, { role: 'assistant', content: responseText }]
        };
      } 
      
      if (this.provider.toLowerCase() === 'openai') {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: this.model || 'gpt-4',
            messages: memory.map((m: any) => ({ role: m.role, content: m.content }))
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'OpenAI API error');
        
        const responseText = data.choices[0]?.message?.content || '';
        return {
          response: responseText,
          memory: [...memory, { role: 'assistant', content: responseText }]
        };
      }

      throw new Error(`Unsupported provider: ${this.provider}`);
    } catch (e: any) {
      return { error: `Agent failed: ${e.message}` };
    }
  }
}
