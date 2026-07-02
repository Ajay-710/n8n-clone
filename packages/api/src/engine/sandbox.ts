import * as vm from 'vm';

export class ExpressionSandbox {
  /**
   * Evaluates an n8n-style expression like {{$json.name}} or {{ $node["HTTP"].json.data }}
   */
  static evaluate(expression: string, contextData: Record<string, any>): any {
    // If it's not a template expression, return as-is
    if (typeof expression !== 'string' || !expression.includes('{{') || !expression.includes('}}')) {
      return expression;
    }

    try {
      // Extract everything inside {{ }}
      const code = expression.replace(/^{{/, '').replace(/}}$/, '').trim();
      
      // Create a secure context
      const context = vm.createContext({
        $json: contextData.$json || {},
        $env: process.env,
        $node: contextData.$node || {},
        $now: new Date().toISOString(),
      });

      // Execute code securely
      const result = vm.runInContext(code, context, {
        timeout: 1000, // 1 second max execution time to prevent infinite loops
      });
      
      return result;
    } catch (error) {
      console.error(`Expression evaluation failed for "${expression}":`, error.message);
      return null;
    }
  }

  /**
   * Resolves all properties in a parameter object
   */
  static resolveParameters(params: Record<string, any>, contextData: Record<string, any>): Record<string, any> {
    const resolved: Record<string, any> = {};
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        resolved[key] = this.evaluate(value, contextData);
      } else if (typeof value === 'object' && value !== null) {
        resolved[key] = this.resolveParameters(value, contextData);
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }
}
