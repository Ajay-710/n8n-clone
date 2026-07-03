import { useState } from 'react';
import type { Node } from 'reactflow';
import { NODE_SCHEMAS } from '../node-schemas';
import type { INodeProperties, INodeSchema } from '../node-schemas';

export default function ConfigPanel({ 
  selectedNode, 
  updateNodeData, 
  deleteNode,
  executionData,
  credentials,
  onClose,
  onExecuteNode,
  inputData
}: { 
  selectedNode: Node | null, 
  updateNodeData: (id: string, key: string, value: any) => void, 
  deleteNode: (id: string) => void,
  executionData?: Record<string, any>,
  credentials: any[],
  onClose: () => void,
  onExecuteNode: (id: string) => void,
  inputData?: any
}) {
  const [middleTab, setMiddleTab] = useState<'parameters' | 'settings'>('parameters');

  if (!selectedNode) return null;

  const { id, data } = selectedNode;
  const type = data?.type || selectedNode.type;
  const parameters = data.parameters || {};
  const outputData = executionData ? executionData[id] : null;

  const evaluateExpression = (expr: string) => {
    if (!expr || !expr.includes('{{')) return null;
    if (!inputData) return 'Requires input data to evaluate';
    try {
      return expr.replace(/\{\{([\s\S]+?)\}\}/g, (_, code) => {
        const $json = Array.isArray(inputData) ? inputData[0] : inputData;
        const fn = new Function('$json', `try { return ${code}; } catch(e) { return "[Error]"; }`);
        const result = fn($json);
        return typeof result === 'object' ? JSON.stringify(result) : String(result);
      });
    } catch (e) {
      return `[Eval Error]`;
    }
  };

  const schema: INodeSchema | undefined = NODE_SCHEMAS[type];

  // Helper to determine if a property should be shown based on displayOptions
  const isPropertyVisible = (prop: INodeProperties) => {
    if (!prop.displayOptions) return true;
    
    if (prop.displayOptions.show) {
      for (const [key, values] of Object.entries(prop.displayOptions.show)) {
        const currentValue = parameters[key];
        if (!values.includes(currentValue)) return false;
      }
    }
    
    if (prop.displayOptions.hide) {
      for (const [key, values] of Object.entries(prop.displayOptions.hide)) {
        const currentValue = parameters[key];
        if (values.includes(currentValue)) return false;
      }
    }
    
    return true;
  };

  const renderProperty = (prop: INodeProperties) => {
    if (!isPropertyVisible(prop)) return null;

    const value = parameters[prop.name] !== undefined ? parameters[prop.name] : prop.default;
    const handleChange = (val: any) => updateNodeData(id, prop.name, val);

    let inputElement = null;

    switch (prop.type) {
      case 'string':
      case 'expression':
        inputElement = (
          <div className="flex flex-col gap-1 w-full">
            <input 
              type="text" 
              value={value} 
              onChange={e => handleChange(e.target.value)}
              placeholder={prop.placeholder || ''} 
              className="w-full bg-[#161616] border-2 border-[#333] focus:border-[#ff6600] p-2 text-sm text-[#e5e5e5] outline-none font-mono transition-colors" 
            />
            {evaluateExpression(value) && (
              <div className="mt-1 p-2 bg-[#111] border border-[#333] text-[10px] text-[#999] font-mono break-all">
                <span className="text-[#00ffcc] font-bold uppercase block mb-1">Preview</span>
                {evaluateExpression(value)}
              </div>
            )}
          </div>
        );
        break;
      
      case 'number':
        inputElement = (
          <input 
            type="number" 
            value={value} 
            onChange={e => handleChange(Number(e.target.value))}
            className="w-full bg-[#161616] border-2 border-[#333] focus:border-[#ff6600] p-2 text-sm text-[#e5e5e5] outline-none font-mono transition-colors" 
          />
        );
        break;
        
      case 'options':
        inputElement = (
          <select 
            value={value} 
            onChange={e => handleChange(e.target.value)}
            className="w-full bg-[#161616] border-2 border-[#333] focus:border-[#ff6600] p-2 text-sm text-[#e5e5e5] outline-none font-mono transition-colors"
          >
            {prop.options?.map(opt => (
              <option key={opt.value.toString()} value={opt.value.toString()}>{opt.name}</option>
            ))}
          </select>
        );
        break;

      case 'json':
      case 'code':
        inputElement = (
          <div className="flex flex-col gap-1 w-full">
            <textarea 
              rows={prop.typeOptions?.rows || 4}
              value={value} 
              onChange={e => handleChange(e.target.value)}
              placeholder={prop.placeholder || ''}
              className="w-full bg-[#161616] border-2 border-[#333] focus:border-[#ff6600] p-2 text-sm text-[#e5e5e5] outline-none font-mono transition-colors" 
            />
            {evaluateExpression(value) && (
              <div className="mt-1 p-2 bg-[#111] border border-[#333] text-[10px] text-[#999] font-mono whitespace-pre-wrap">
                <span className="text-[#00ffcc] font-bold uppercase block mb-1">Preview</span>
                {evaluateExpression(value)}
              </div>
            )}
          </div>
        );
        break;

      case 'credential':
        inputElement = (
          <select 
            value={value} 
            onChange={e => handleChange(e.target.value)}
            className="w-full bg-[#161616] border-2 border-[#333] focus:border-[#00ffcc] p-2 text-sm text-[#e5e5e5] outline-none font-mono transition-colors"
          >
            <option value="">-- Select Credential --</option>
            {credentials
              .filter(c => !prop.typeOptions?.credentialTypes || prop.typeOptions.credentialTypes.includes(c.type))
              .map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
          </select>
        );
        break;
        
      case 'conditionBuilder':
        inputElement = (
          <input 
            type="text" 
            value={value?.expression || value || ''} 
            onChange={e => handleChange(e.target.value)}
            placeholder="{{ $json.status === 200 }}" 
            className="w-full bg-[#161616] border-2 border-[#333] focus:border-[#00ffcc] p-2 text-sm text-[#e5e5e5] outline-none font-mono transition-colors" 
          />
        );
        break;
        
      case 'messageBuilder':
        inputElement = (
          <div className="border border-[#333] p-2 bg-[#111] flex flex-col gap-2">
            <div className="text-xs text-[#999] mb-1 italic">Message Builder is simplified to JSON for MVP</div>
            <textarea 
              rows={4}
              value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value} 
              onChange={e => handleChange(e.target.value)}
              placeholder="[{ role: 'user', content: 'Hello' }]"
              className="w-full bg-[#161616] border-2 border-[#333] focus:border-[#ff6600] p-2 text-sm text-[#e5e5e5] outline-none font-mono transition-colors" 
            />
          </div>
        );
        break;
        
      default:
        inputElement = <div className="text-xs text-red-500">Unsupported field type: {prop.type}</div>;
    }

    return (
      <div key={prop.name} className="flex flex-col gap-2 mb-4">
        <label className="text-xs font-bold text-[#e5e5e5] uppercase tracking-wider flex items-center justify-between">
          <span>{prop.displayName} {prop.required && <span className="text-[#ff4444]">*</span>}</span>
          <span className="text-[#666] lowercase text-[9px]">{prop.name}</span>
        </label>
        {prop.description && <span className="text-[10px] text-[#999] mb-1 leading-tight">{prop.description}</span>}
        {inputElement}
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-8 animate-in fade-in duration-200">
      <div className="w-full max-w-6xl h-[85vh] bg-[#161616] flex flex-col border border-[#333] shadow-2xl rounded-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
      <header className="h-16 border-b-2 border-[#333] flex items-center px-6 shrink-0 justify-between bg-[#111]">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-[#222] border-2 border-[#333] flex items-center justify-center">
            <span className="text-[#00ffcc] font-bold text-xs">{(schema?.displayName || data?.label || 'UN').substring(0, 2).toUpperCase()}</span>
          </div>
          <div>
            <h2 className="font-bold text-[#e5e5e5] tracking-widest uppercase">{data.label}</h2>
            <div className="text-[10px] text-[#999] uppercase tracking-wider">{type} - {id}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => deleteNode(id)} className="p-2 border-2 border-[#ff4444] text-[#ff4444] hover:bg-[#ff4444] hover:text-[#161616] transition-colors" title="Delete Node">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
          <div className="w-px h-6 bg-[#333]"></div>
          <button onClick={onClose} className="p-2 border-2 border-[#333] text-[#e5e5e5] hover:bg-[#333] transition-colors" title="Close Editor">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Pane - Input Data */}
        <div className="w-[30%] border-r-2 border-[#333] flex flex-col bg-[#111]">
          <div className="h-12 border-b-2 border-[#333] flex items-center px-4">
            <span className="text-xs font-bold tracking-widest uppercase text-[#999]">Input Data</span>
          </div>
          <div className="flex-1 overflow-auto p-4 flex flex-col">
            {inputData ? (
              <pre className="text-[10px] text-[#00ffcc] font-mono break-all whitespace-pre-wrap">
                {JSON.stringify(inputData, null, 2)}
              </pre>
            ) : (
              <div className="text-center text-[#666] text-xs uppercase tracking-widest border-2 border-dashed border-[#333] p-8 w-full my-auto">
                No input data.<br/><br/>
                <button onClick={() => onExecuteNode(id)} className="px-4 py-2 mt-4 bg-[#ff6600] text-[#161616] font-bold border-2 border-[#ff6600] hover:bg-transparent hover:text-[#ff6600] transition-colors rounded-sm cursor-pointer">Execute Step</button>
              </div>
            )}
          </div>
        </div>

        {/* Middle Pane - Config */}
        <div className="w-[40%] border-r-2 border-[#333] flex flex-col">
          <div className="flex h-12 border-b-2 border-[#333]">
            {['parameters', 'settings'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setMiddleTab(tab as any)}
                className={`flex-1 text-xs font-bold tracking-widest uppercase border-b-2 transition-colors ${middleTab === tab ? 'border-[#ff6600] text-[#ff6600] bg-[#ff6600]/10' : 'border-transparent text-[#999] hover:bg-[#222]'}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {middleTab === 'parameters' && (
              schema ? (
                <div className="flex flex-col">
                  {schema.properties.map(prop => renderProperty(prop))}
                </div>
              ) : (
                <div className="text-[#999] text-sm">
                  <div className="mb-4 text-xs uppercase tracking-widest text-[#ff4444] font-bold">Schema Missing!</div>
                  <p className="mb-4">No node schema definition found for <strong className="text-[#e5e5e5]">{type}</strong>.</p>
                  <p>Falling back to raw JSON editing for parameters:</p>
                  <textarea 
                    className="mt-2 w-full h-64 bg-[#111] border-2 border-[#333] p-4 font-mono text-xs text-[#e5e5e5] outline-none focus:border-[#ff6600]"
                    value={JSON.stringify(parameters, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        Object.keys(parsed).forEach(k => updateNodeData(id, k, parsed[k]));
                      } catch {}
                    }}
                  />
                </div>
              )
            )}
            
            {middleTab === 'settings' && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-[#e5e5e5] uppercase tracking-wider">Node Name</label>
                  <input 
                    type="text" 
                    value={data.label} 
                    onChange={e => updateNodeData(id, 'label', e.target.value)}
                    className="w-full bg-[#161616] border-2 border-[#333] focus:border-[#ff6600] p-2 text-sm text-[#e5e5e5] outline-none font-mono transition-colors" 
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-[#e5e5e5] uppercase tracking-wider">Notes</label>
                  <textarea 
                    rows={4}
                    value={parameters.notes || ''} 
                    onChange={e => updateNodeData(id, 'notes', e.target.value)}
                    placeholder="Document what this node does..."
                    className="w-full bg-[#161616] border-2 border-[#333] focus:border-[#ff6600] p-2 text-sm text-[#e5e5e5] outline-none font-mono transition-colors" 
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    id="continueOnError"
                    checked={parameters.continueOnError || false}
                    onChange={e => updateNodeData(id, 'continueOnError', e.target.checked)}
                    className="w-4 h-4 accent-[#ff6600]"
                  />
                  <label htmlFor="continueOnError" className="text-sm font-bold text-[#e5e5e5]">Continue On Error</label>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Right Pane - Output Data */}
        <div className="flex-1 flex flex-col bg-[#161616]">
          <div className="h-12 border-b-2 border-[#333] flex items-center justify-between px-4 bg-[#111]">
            <span className="text-xs font-bold tracking-widest uppercase text-[#999]">Output</span>
            <button onClick={() => onExecuteNode(id)} className="px-3 py-1 bg-[#ff6600] text-[#161616] font-bold text-xs uppercase hover:bg-[#cc5200] transition-colors rounded-sm shadow-[0_0_10px_rgba(255,102,0,0.3)]">
              ▶ Execute Node
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4 flex flex-col relative">
            {outputData ? (
              <pre className="text-[10px] text-[#e5e5e5] font-mono break-all whitespace-pre-wrap">
                {JSON.stringify(outputData, null, 2)}
              </pre>
            ) : (
              <div className="text-center text-[#666] text-xs uppercase tracking-widest border-2 border-dashed border-[#333] p-8 w-full my-auto">
                No output data.<br/><br/>Execute the node to see results here.
              </div>
            )}
          </div>
        </div>

      </div>
      </div>
    </div>
  );
}
