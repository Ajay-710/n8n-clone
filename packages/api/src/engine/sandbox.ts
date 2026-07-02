import * as vm from 'vm';

export class ExpressionSandbox {
  /**
   * Evaluates an n8n-style expression like {{$json.name}} or {{ $node["HTTP"].json.data }}
   */
  static evaluate(expression: string, contextData: Record<string, any>): any {
    if (typeof expression !== 'string' || !expression.includes('{{')) {
      return expression;
    }

    const context = vm.createContext({
      $json: contextData.$json || {},
      $env: process.env,
      $node: contextData.$node || {},
      $now: new Date().toISOString(),
      $today: new Date().toISOString().split('T')[0],
      Math: Math,
      Date: Date,
      JSON: JSON,
      String: String,
      Number: Number,
      Array: Array,
      Object: Object,
      parseInt: parseInt,
      parseFloat: parseFloat
    });

    // If the expression is purely exactly one {{ ... }} block, return the exact evaluated type (object, boolean, etc.)
    const exactMatch = expression.match(/^\{\{(.*?)\}\}$/);
    if (exactMatch) {
      try {
        return vm.runInContext(exactMatch[1].trim(), context, { timeout: 1000 });
      } catch (error: any) {
        console.error(`Expression evaluation failed for "${expression}":`, error.message);
        return null;
      }
    }

    // Otherwise, replace all occurrences inline and cast to string
    return expression.replace(/\{\{(.*?)\}\}/g, (match, code) => {
      try {
        const result = vm.runInContext(code.trim(), context, { timeout: 1000 });
        return typeof result === 'object' ? JSON.stringify(result) : String(result);
      } catch (error: any) {
        console.error(`Inline expression evaluation failed for "${code}":`, error.message);
        return match; // leave unresolved
      }
    });
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
