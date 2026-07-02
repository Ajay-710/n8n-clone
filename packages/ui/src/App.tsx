import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  ReactFlowProvider,
} from 'reactflow';
import type { ReactFlowInstance, Connection, Edge, Node } from 'reactflow';
import CustomNode from './components/CustomNode';
import CredentialsManager from './components/CredentialsManager';
import 'reactflow/dist/style.css';

const nodeTypes = {
  default: CustomNode
};

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

let id = Date.now();
const getId = () => `node_${id++}`;

const DEFAULT_WORKFLOW_ID = 'default-workflow';

function Sidebar({ isOpen = true, onToggle, currentView, setView }: { isOpen?: boolean, onToggle?: () => void, currentView: string, setView: (v: string) => void }) {
  if (!isOpen) {
    return (
      <button 
        onClick={onToggle}
        className="absolute top-4 left-4 z-50 p-2 px-3 bg-[#161616] border-2 border-[#e5e5e5] text-[#e5e5e5] hover:bg-[#e5e5e5] hover:text-[#161616] transition-all cursor-pointer font-bold text-xs tracking-widest"
        title="Open Navigation"
      >
        &gt;&gt;
      </button>
    );
  }

  return (
    <aside className="w-64 border-r-2 border-[#333] bg-[#161616] flex flex-col z-10 shrink-0 relative h-full">
      <div className="flex justify-between items-center mb-4 border-b-2 border-[#333] p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#e5e5e5] bg-[#161616] flex items-center justify-center">
            <span className="text-[#e5e5e5] font-bold text-lg uppercase">N</span>
          </div>
          <h2 className="text-[#e5e5e5] font-bold tracking-widest uppercase">n7n</h2>
        </div>
        <button 
          onClick={onToggle}
          className="text-[#999] hover:text-[#e5e5e5] font-bold text-sm tracking-widest transition-colors cursor-pointer"
          title="Close Navigation"
        >
          &lt;&lt;
        </button>
      </div>
      
      <nav className="flex flex-col gap-2 px-4">
        <button 
          onClick={() => setView('dashboard')}
          className={`p-3 text-sm font-bold tracking-widest uppercase text-left transition-all ${currentView === 'dashboard' ? 'bg-[#e5e5e5] text-[#161616]' : 'text-[#999] hover:bg-[#333] hover:text-[#e5e5e5]'}`}
        >
          Workflows
        </button>
        <button 
          onClick={() => setView('credentials')}
          className={`p-3 text-sm font-bold tracking-widest uppercase text-left transition-all ${currentView === 'credentials' ? 'bg-[#e5e5e5] text-[#161616]' : 'text-[#999] hover:bg-[#333] hover:text-[#e5e5e5]'}`}
        >
          Credentials
        </button>
        <button 
          onClick={() => setView('workflow')}
          className={`p-3 text-sm font-bold tracking-widest uppercase text-left transition-all ${currentView === 'workflow' ? 'bg-[#e5e5e5] text-[#161616]' : 'text-[#999] hover:bg-[#333] hover:text-[#e5e5e5]'}`}
        >
          Editor View
        </button>
      </nav>
    </aside>
  );
}

const NODE_CATALOG = [
  { type: 'Webhook', label: 'Webhook', category: 'Triggers', description: 'Starts workflow on HTTP request', icon: '⚡' },
  { type: 'ManualTrigger', label: 'Manual Trigger', category: 'Triggers', description: 'Starts workflow when clicking Execute', icon: '▶️' },
  { type: 'HTTPRequest', label: 'HTTP Request', category: 'Actions', description: 'Make an HTTP request', icon: '🌐' },
  { type: 'AIAgent', label: 'AI Agent', category: 'AI', description: 'Run an AI prompt', icon: '🧠' },
  { type: 'Set', label: 'Set Data', category: 'Data', description: 'Set specific values', icon: '🔧' },
  { type: 'IF', label: 'IF Condition', category: 'Logic', description: 'Branch based on condition', icon: '🔀' },
];

function NodePicker({ 
  isOpen, 
  setIsOpen,
  onDragStart,
  onAddNode
}: { 
  isOpen: boolean,
  setIsOpen: (o: boolean) => void,
  onDragStart: (event: React.DragEvent, type: string, label: string) => void,
  onAddNode: (type: string, label: string) => void
}) {
  const [search, setSearch] = useState('');

  const filteredNodes = NODE_CATALOG.filter(n => 
    n.label.toLowerCase().includes(search.toLowerCase()) || 
    n.type.toLowerCase().includes(search.toLowerCase()) ||
    n.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="absolute bottom-8 right-8 z-50 flex flex-col items-end gap-4 pointer-events-none">
      {isOpen && (
        <div className="w-80 bg-[#161616] border-2 border-[#333] flex flex-col shadow-lg shadow-black/80 max-h-[500px] pointer-events-auto animate-in slide-in-from-bottom-2 fade-in duration-150">
          <div className="p-4 border-b-2 border-[#333] bg-[#111]">
            <h3 className="text-[#00ffcc] font-bold tracking-widest uppercase text-xs mb-3">Add Node</h3>
            <input 
              autoFocus
              type="text" 
              placeholder="Search nodes (e.g. HTTP, AI)..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#161616] border-2 border-[#333] focus:border-[#00ffcc] p-2 text-sm text-[#e5e5e5] outline-none transition-colors font-mono"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {filteredNodes.length === 0 ? (
              <div className="text-center p-4 text-[#666] text-xs uppercase tracking-widest">No nodes found</div>
            ) : (
              <div className="flex flex-col gap-1">
                {filteredNodes.map(node => (
                  <div 
                    key={node.type}
                    onClick={() => { onAddNode(node.type, node.label); setIsOpen(false); }}
                    onDragStart={(event) => onDragStart(event, node.type, node.label)}
                    draggable
                    className="flex items-center gap-3 p-3 border-2 border-transparent hover:border-[#333] hover:bg-[#222] cursor-pointer transition-colors group"
                  >
                    <div className="w-10 h-10 bg-[#111] border-2 border-[#333] flex items-center justify-center text-lg shrink-0 group-hover:border-[#00ffcc] transition-colors">
                      {node.icon}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <div className="text-sm font-bold text-[#e5e5e5] truncate">{node.label}</div>
                      <div className="text-[10px] text-[#999] uppercase tracking-wider truncate">{node.category} &bull; {node.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-[#161616] text-[#e5e5e5] rounded-none border-2 border-[#e5e5e5] font-bold text-3xl hover:bg-[#e5e5e5] hover:text-[#161616] transition-all shadow-lg flex items-center justify-center pb-1 cursor-pointer pointer-events-auto"
        title="Add Nodes (Space or Right-Click)"
      >
        {isOpen ? '×' : '+'}
      </button>
    </div>
  );
}

function Dashboard({ onOpenWorkflow }: { onOpenWorkflow: (id: string) => void }) {
  const [workflows, setWorkflows] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/v1/workflows')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success' || data.status === 'mock_fallback') {
          setWorkflows(data.data);
        }
      });
  }, []);

  return (
    <div className="flex-1 bg-[#161616] p-8 overflow-y-auto text-[#e5e5e5] font-mono h-full">
      <div className="flex justify-between items-center mb-12 border-b-2 border-[#333] pb-4">
        <h1 className="text-3xl font-bold tracking-widest uppercase text-[#e5e5e5]">Workflows</h1>
        <button 
          onClick={() => onOpenWorkflow(`workflow_${Date.now()}`)}
          className="px-4 py-2 border-2 border-[#e5e5e5] bg-[#e5e5e5] text-[#161616] font-bold uppercase tracking-widest hover:bg-[#161616] hover:text-[#e5e5e5] transition-colors cursor-pointer"
        >
          + New Workflow
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workflows.map(wf => (
          <div 
            key={wf.id} 
            onClick={() => onOpenWorkflow(wf.id)}
            className="border-2 border-[#333] bg-[#222] p-6 cursor-pointer hover:border-[#e5e5e5] transition-colors flex flex-col gap-4"
          >
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-lg">{wf.name || 'Untitled Workflow'}</h3>
              <div className={`w-3 h-3 rounded-full ${wf.active !== false ? 'bg-[#00ffcc]' : 'bg-[#666]'}`}></div>
            </div>
            <div className="text-[#999] text-xs">ID: {wf.id}</div>
            <button className="mt-4 px-3 py-1.5 border border-[#666] text-[#e5e5e5] text-xs font-bold uppercase tracking-widest hover:bg-[#333]">
              Open Editor
            </button>
          </div>
        ))}
        {workflows.length === 0 && (
          <div className="col-span-full text-center text-[#666] p-12 border-2 border-dashed border-[#333]">
            No workflows found.
          </div>
        )}
      </div>
    </div>
  );
}

function ConfigPanel({ 
  selectedNode, 
  updateNodeData, 
  deleteNode,
  executionData,
  onClose
}: { 
  selectedNode: Node | null, 
  updateNodeData: (id: string, key: string, value: any) => void, 
  deleteNode: (id: string) => void,
  executionData?: Record<string, any>,
  credentials: any[],
  onClose: () => void
}) {
  const [leftTab, setLeftTab] = useState<'parameters' | 'settings'>('parameters');
  const [rightTab, setRightTab] = useState<'input' | 'output'>('output');

  if (!selectedNode) return null;

  const { id, type, data } = selectedNode;
  const parameters = data.parameters || {};
  const outputData = executionData ? executionData[id] : null;

  return (
    <div className="absolute inset-0 z-50 bg-[#161616] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <header className="h-16 border-b-2 border-[#333] flex items-center px-6 shrink-0 justify-between bg-[#111]">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-[#222] border-2 border-[#333] flex items-center justify-center">
            <span className="text-[#00ffcc] font-bold text-xs">{(type || data?.label || 'UN').substring(0, 2).toUpperCase()}</span>
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
        {/* Left Pane - Config */}
        <div className="w-1/2 border-r-2 border-[#333] flex flex-col">
          <div className="flex border-b-2 border-[#333]">
            {['parameters', 'settings'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setLeftTab(tab as any)}
                className={`flex-1 py-3 text-xs font-bold tracking-widest uppercase border-b-2 transition-colors ${leftTab === tab ? 'border-[#00ffcc] text-[#00ffcc] bg-[#00ffcc] bg-opacity-5' : 'border-transparent text-[#999] hover:bg-[#222]'}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {leftTab === 'parameters' && (
              <>
                {type === 'HTTPRequest' && (
                  <>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-[#e5e5e5] uppercase tracking-wider">Credential (Vault)</label>
                      <select 
                        value={parameters.credentialId || ''} 
                        onChange={(e) => updateNodeData(id, 'credentialId', e.target.value)}
                        className="bg-[#161616] border-2 border-[#333] focus:border-[#00ffcc] p-2 text-sm text-[#e5e5e5] outline-none font-mono transition-colors"
                      >
                        <option value="">-- No Credential --</option>
                        {credentials.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-[#e5e5e5] uppercase tracking-wider">Method</label>
                      <select 
                        value={parameters.method || 'GET'} 
                        onChange={(e) => updateNodeData(id, 'method', e.target.value)}
                        className="bg-[#161616] border-2 border-[#333] focus:border-[#00ffcc] p-2 text-sm text-[#e5e5e5] outline-none font-mono uppercase transition-colors"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                        <option value="PATCH">PATCH</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-[#e5e5e5] uppercase tracking-wider">URL</label>
                      <input 
                        type="text" 
                        value={parameters.url || ''} 
                        onChange={(e) => updateNodeData(id, 'url', e.target.value)}
                        placeholder="https://api.example.com" 
                        className="bg-[#161616] border-2 border-[#333] focus:border-[#00ffcc] p-2 text-sm text-[#e5e5e5] outline-none font-mono transition-colors" 
                      />
                    </div>
                    {['POST', 'PUT', 'PATCH'].includes(parameters.method || 'GET') && (
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-[#e5e5e5] uppercase tracking-wider">Body (JSON)</label>
                        <textarea 
                          rows={6}
                          value={parameters.body || ''} 
                          onChange={(e) => updateNodeData(id, 'body', e.target.value)}
                          className="bg-[#161616] border-2 border-[#333] focus:border-[#00ffcc] p-2 text-sm text-[#e5e5e5] outline-none font-mono transition-colors" 
                        />
                      </div>
                    )}
                  </>
                )}

                {type === 'IF' && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-[#e5e5e5] uppercase tracking-wider">Condition Expression</label>
                    <input 
                      type="text" 
                      value={parameters.condition || ''} 
                      onChange={(e) => updateNodeData(id, 'condition', e.target.value)}
                      placeholder="{{ $json.status === 200 }}" 
                      className="bg-[#161616] border-2 border-[#333] focus:border-[#00ffcc] p-2 text-sm text-[#e5e5e5] outline-none font-mono transition-colors" 
                    />
                    <span className="text-[10px] text-[#999] mt-1">Use JavaScript expressions to evaluate data from previous nodes.</span>
                  </div>
                )}

                {type === 'Set' && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-[#e5e5e5] uppercase tracking-wider">Fields to Set (JSON)</label>
                    <textarea 
                      rows={6}
                      value={parameters.value || ''} 
                      onChange={(e) => updateNodeData(id, 'value', e.target.value)}
                      placeholder='{"key": "value", "dynamic": "{{$json.id}}"}'
                      className="bg-[#161616] border-2 border-[#333] focus:border-[#00ffcc] p-2 text-sm text-[#e5e5e5] outline-none font-mono transition-colors" 
                    />
                  </div>
                )}
                
                {type === 'Webhook' && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-[#e5e5e5] uppercase tracking-wider">HTTP Method</label>
                    <select 
                      value={parameters.method || 'POST'} 
                      onChange={(e) => updateNodeData(id, 'method', e.target.value)}
                      className="bg-[#161616] border-2 border-[#333] focus:border-[#00ffcc] p-2 text-sm text-[#e5e5e5] outline-none font-mono uppercase transition-colors"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                    </select>
                    
                    <label className="text-xs font-bold text-[#e5e5e5] uppercase tracking-wider mt-4">Path</label>
                    <input 
                      type="text" 
                      value={parameters.path || ''} 
                      onChange={(e) => updateNodeData(id, 'path', e.target.value)}
                      placeholder="webhook" 
                      className="bg-[#161616] border-2 border-[#333] focus:border-[#00ffcc] p-2 text-sm text-[#e5e5e5] outline-none font-mono transition-colors" 
                    />
                    <span className="text-[10px] text-[#00ffcc] mt-1 break-all">URL: /api/v1/webhook/workflow_id/{parameters.path || 'webhook'}</span>
                  </div>
                )}
                {type === 'AIAgent' && (
                  <>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-[#e5e5e5] uppercase tracking-wider">Credential (Vault)</label>
                      <select 
                        value={parameters.credentialId || ''} 
                        onChange={(e) => updateNodeData(id, 'credentialId', e.target.value)}
                        className="bg-[#161616] border-2 border-[#333] focus:border-[#00ffcc] p-2 text-sm text-[#e5e5e5] outline-none font-mono transition-colors"
                      >
                        <option value="">-- No Credential --</option>
                        {credentials.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-[#e5e5e5] uppercase tracking-wider">Provider</label>
                      <select 
                        value={parameters.provider || 'openai'} 
                        onChange={(e) => updateNodeData(id, 'provider', e.target.value)}
                        className="bg-[#161616] border-2 border-[#333] focus:border-[#00ffcc] p-2 text-sm text-[#e5e5e5] outline-none font-mono transition-colors uppercase"
                      >
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic (Claude)</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-[#e5e5e5] uppercase tracking-wider">Model</label>
                      <input 
                        type="text" 
                        value={parameters.model || ''} 
                        onChange={(e) => updateNodeData(id, 'model', e.target.value)}
                        placeholder="e.g. gpt-4 or claude-3-opus-20240229" 
                        className="bg-[#161616] border-2 border-[#333] focus:border-[#00ffcc] p-2 text-sm text-[#e5e5e5] outline-none font-mono transition-colors" 
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-[#e5e5e5] uppercase tracking-wider">Prompt Expression</label>
                      <textarea 
                        rows={6}
                        value={parameters.prompt || ''} 
                        onChange={(e) => updateNodeData(id, 'prompt', e.target.value)}
                        placeholder="Summarize the previous data: {{$json.body}}"
                        className="bg-[#161616] border-2 border-[#333] focus:border-[#00ffcc] p-2 text-sm text-[#e5e5e5] outline-none font-mono transition-colors" 
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {leftTab === 'settings' && (
              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-[#e5e5e5] uppercase tracking-wider">Node Name</label>
                  <input type="text" value={data.label} onChange={(e) => updateNodeData(id, 'label', e.target.value)} className="bg-[#161616] border-2 border-[#333] focus:border-[#00ffcc] p-2 text-sm text-[#e5e5e5] outline-none transition-colors" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-[#e5e5e5] uppercase tracking-wider">Notes</label>
                  <textarea rows={4} className="bg-[#161616] border-2 border-[#333] focus:border-[#00ffcc] p-2 text-sm text-[#e5e5e5] outline-none transition-colors" placeholder="Add notes here to document this node's purpose..." />
                </div>
                <div className="flex items-center gap-2 mt-4 p-4 border-2 border-[#333] bg-[#222]">
                  <input type="checkbox" className="w-4 h-4 bg-[#161616] border-2 border-[#333] accent-[#00ffcc]" />
                  <label className="text-xs font-bold text-[#e5e5e5] uppercase tracking-wider">Continue On Fail</label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane - Execution Data */}
        <div className="w-1/2 flex flex-col bg-[#111]">
          <div className="flex border-b-2 border-[#333] bg-[#161616]">
            {['input', 'output'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setRightTab(tab as any)}
                className={`flex-1 py-3 text-xs font-bold tracking-widest uppercase border-b-2 transition-colors ${rightTab === tab ? 'border-[#00ffcc] text-[#00ffcc] bg-[#00ffcc] bg-opacity-5' : 'border-transparent text-[#999] hover:bg-[#222]'}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-auto p-6 flex flex-col">
            {rightTab === 'input' && (
              <div className="text-center mt-20 text-[#666] text-xs uppercase tracking-widest border-2 border-dashed border-[#333] p-8">
                Input data will be displayed here.<br/><br/>
                Execute previous nodes to see data flowing into this node.
              </div>
            )}
            {rightTab === 'output' && (
              <div className="flex flex-col h-full gap-4">
                {outputData ? (
                  <>
                    <div className="flex items-center gap-4 text-[10px] uppercase font-bold text-[#00ffcc] tracking-widest border border-[#333] p-2 bg-[#161616]">
                      <span>Items: {Array.isArray(outputData.json) ? outputData.json.length : 1}</span>
                      <span className="w-px h-3 bg-[#333]"></span>
                      <span>JSON Mode</span>
                    </div>
                    <div className="flex-1 bg-[#161616] border-2 border-[#333] p-4 overflow-auto text-xs text-[#e5e5e5] font-mono whitespace-pre-wrap selection:bg-[#00ffcc] selection:text-[#161616]">
                      {JSON.stringify(outputData.json, null, 2)}
                    </div>
                  </>
                ) : (
                   <div className="text-center mt-20 text-[#666] text-xs uppercase tracking-widest border-2 border-dashed border-[#333] p-8">
                     No output data available.<br/><br/>
                     Run this node to generate output.
                   </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FlowBuilder({ workflowId }: { workflowId: string }) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Execution Viewer State
  const [showExecutions, setShowExecutions] = useState(false);
  const [executions, setExecutions] = useState<any[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<any | null>(null);
  
  // Real-time execution tracking
  const [isExecuteMenuOpen, setIsExecuteMenuOpen] = useState(false);
  const [executionMode, setExecutionMode] = useState<'idle' | 'waiting' | 'running'>('idle');

  // Node Picker State
  const [isNodePickerOpen, setIsNodePickerOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsNodePickerOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const sse = new EventSource('/api/v1/events/executions');
    sse.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === 'node.started') {
          setExecutionMode('running');
          setNodes(nds => nds.map(n => n.id === payload.nodeId ? { ...n, className: '!border-[#3399ff] !bg-[#112233] shadow-[0_0_15px_rgba(51,153,255,0.4)]' } : n));
        } else if (payload.type === 'node.completed') {
          setNodes(nds => nds.map(n => n.id === payload.nodeId ? { ...n, className: '!border-[#00ffcc] !bg-[#003322] shadow-[0_0_15px_rgba(0,255,204,0.4)]' } : n));
        } else if (payload.type === 'node.failed') {
          setNodes(nds => nds.map(n => n.id === payload.nodeId ? { ...n, className: '!border-[#ff4444] !bg-[#331111] shadow-[0_0_15px_rgba(255,68,68,0.4)]' } : n));
        } else if (payload.type === 'execution.completed') {
          setExecutionMode('idle');
          alert('Execution finished successfully!');
        } else if (payload.type === 'execution.failed') {
          setExecutionMode('idle');
          alert(`Execution failed: ${payload.error}`);
        }
      } catch (err) {}
    };
    return () => sse.close();
  }, [setNodes]);

  // Load workflow on mount
  useEffect(() => {
    fetch(`/api/v1/workflows/${workflowId}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success' && data.data && data.data.WorkflowVersion?.[0]) {
          const version = data.data.WorkflowVersion[0];
          if (version.nodes) setNodes(version.nodes);
          if (version.connections) setEdges(version.connections);
        }
      })
      .catch(err => console.error("Could not load workflow", err));
      
    // Fetch execution history
    fetchExecutions();
    fetchCredentials();
  }, [workflowId, setNodes, setEdges]);

  const [credentialsList, setCredentialsList] = useState<any[]>([]);
  const fetchCredentials = () => {
    fetch('/api/v1/credentials')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setCredentialsList(data.data);
        }
      });
  };

  const fetchExecutions = () => {
    fetch(`/api/v1/workflows/${workflowId}/executions`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setExecutions(data.data);
        }
      });
  };

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const label = event.dataTransfer.getData('application/label');

      if (typeof type === 'undefined' || !type || !reactFlowInstance) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: getId(),
        type: 'default', // React flow visual type
        position,
        data: { label, type, parameters: {} }, // Engine type goes here
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const onPaneContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsNodePickerOpen(true);
  }, []);

  const onAddNode = useCallback((type: string, label: string) => {
    const position = reactFlowInstance ? reactFlowInstance.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 }) : { x: 100, y: 100 };
    const newNode: Node = {
      id: getId(),
      type: 'default',
      position,
      data: { label, type, parameters: {} },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [reactFlowInstance, setNodes]);

  const updateNodeData = useCallback((id: string, key: string, value: any) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === id) {
          return {
            ...n,
            data: {
              ...n.data,
              parameters: {
                ...(n.data.parameters || {}),
                [key]: value
              }
            }
          };
        }
        return n;
      })
    );
  }, [setNodes]);

  const deleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedNodeId(null);
  }, [setNodes, setEdges]);

  const saveWorkflow = async () => {
    try {
      await fetch(`/api/v1/workflows/${workflowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, connections: edges })
      });
      alert('Workflow saved!');
    } catch (e: any) {
      alert(`Save failed: ${e.message}`);
    }
  };

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ nodes, edges }, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "n7n-workflow.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const importJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        
        let newNodes: Node[] = [];
        let newEdges: Edge[] = [];

        if (json.nodes && Array.isArray(json.nodes)) {
          newNodes = json.nodes.map((n: any) => {
            // Check if it's an n8n format node
            if (Array.isArray(n.position)) {
              return {
                id: n.id || getId(),
                type: 'default',
                position: { x: n.position[0], y: n.position[1] },
                data: {
                  label: n.name || n.type || 'Node',
                  type: n.type?.split('.').pop() || 'Unknown',
                  parameters: n.parameters || {}
                }
              };
            }
            // Ensure n7n nodes have the correct ReactFlow visual type and data wrapper
            return {
              ...n,
              type: 'default', 
              data: n.data || { label: 'Node', type: n.type, parameters: n.parameters || {} }
            };
          });
        }

        if (json.edges && Array.isArray(json.edges)) {
          newEdges = json.edges;
        } else if (json.connections) {
          // Parse n8n connections format
          Object.keys(json.connections).forEach(sourceName => {
            const outputs = json.connections[sourceName];
            Object.keys(outputs).forEach(outputType => {
              outputs[outputType].forEach((connectionsList: any[]) => {
                connectionsList.forEach(conn => {
                  const targetName = conn.node;
                  // Look up ReactFlow node IDs by name
                  const sourceNode = newNodes.find(n => n.data.label === sourceName);
                  const targetNode = newNodes.find(n => n.data.label === targetName);
                  if (sourceNode && targetNode) {
                    newEdges.push({
                      id: `e-${sourceNode.id}-${targetNode.id}`,
                      source: sourceNode.id,
                      target: targetNode.id,
                      sourceHandle: null,
                      targetHandle: null
                    });
                  }
                });
              });
            });
          });
        }

        setNodes(newNodes);
        setEdges(newEdges);
        alert('Workflow imported successfully!');
      } catch (err) {
        alert('Invalid JSON file format');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden text-[#e5e5e5] font-mono relative">
      <header className="h-16 border-b-2 border-[#333] flex items-center px-6 bg-[#161616] z-10 shrink-0">
        <h2 className="font-bold text-[#e5e5e5] tracking-widest uppercase">Editor</h2>
        
        {executionMode !== 'idle' && (
          <div className="ml-4 px-2 py-1 bg-[#222] border border-[#333] text-[10px] text-[#00ffcc] uppercase font-bold tracking-widest animate-pulse">
            {executionMode}
          </div>
        )}
        
        <div className="ml-auto flex items-center gap-4">
          <button
            onClick={() => {
              setShowExecutions(!showExecutions);
              if (!showExecutions) fetchExecutions();
              else setSelectedExecution(null);
            }}
            className={`px-4 py-1.5 border-2 text-xs font-bold tracking-widest uppercase transition-all ${showExecutions ? 'border-[#00ffcc] text-[#00ffcc] bg-[#00ffcc] bg-opacity-10' : 'border-[#333] text-[#999] hover:text-[#e5e5e5] hover:bg-[#333]'}`}
          >
            {showExecutions ? 'Back to Editor' : 'Executions'}
          </button>
          <div className="w-px h-6 bg-[#333] mx-2"></div>
          
          <input 
            type="file" 
            accept=".json" 
            ref={fileInputRef} 
            onChange={importJSON} 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 border-2 border-[#333] text-[#999] font-bold text-xs tracking-widest hover:bg-[#333] hover:text-[#e5e5e5] transition-all uppercase cursor-pointer"
          >
            IMPORT JSON
          </button>
          <button 
            onClick={exportJSON}
            className="px-3 py-1.5 border-2 border-[#333] text-[#999] font-bold text-xs tracking-widest hover:bg-[#333] hover:text-[#e5e5e5] transition-all uppercase cursor-pointer"
          >
            EXPORT JSON
          </button>

          <button 
            onClick={saveWorkflow}
            className="ml-4 px-4 py-1.5 border-2 border-[#666] text-[#e5e5e5] font-bold text-sm tracking-widest hover:bg-[#333] transition-all uppercase cursor-pointer"
          >
            SAVE
          </button>

          <div className="relative flex items-center ml-4">
            {executionMode !== 'idle' ? (
              <button 
                onClick={() => {
                  setExecutionMode('idle');
                  // Reset node visual highlights
                  setNodes(nds => nds.map(n => ({ ...n, className: '' })));
                  alert('Execution stopped.');
                }}
                className="px-4 py-1.5 border-2 border-[#ff4444] bg-[#ff4444] text-[#161616] font-bold text-sm tracking-widest hover:bg-[#161616] hover:text-[#ff4444] transition-all uppercase cursor-pointer"
              >
                STOP WORKFLOW
              </button>
            ) : (
              <>
                <button 
                  onClick={async () => {
                    try {
                      setNodes(nds => nds.map(n => ({ ...n, className: '' })));
                      
                      const engineNodes = nodes.map(n => ({
                        id: n.id,
                        type: n.data.type || n.data.label.replace(/\s+/g, ''),
                        parameters: n.data.parameters || {}
                      }));
                      const engineConnections = edges.map(e => ({
                        source: e.source,
                        target: e.target
                      }));

                      const triggerNode = engineNodes.find(n => n.type === 'Webhook');
                      const startId = triggerNode ? triggerNode.id : engineNodes[0]?.id;

                      if (!startId) return alert('Add nodes to execute');

                      setExecutionMode('running');
                      const res = await fetch(`/api/v1/workflows/${workflowId}/execute`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          startingNodeId: startId, 
                          mode: 'manual',
                          nodes: engineNodes,
                          connections: engineConnections
                        })
                      });
                      const data = await res.json();
                      if (data.status !== 'success') {
                        alert(`Execution failed: ${data.message || 'Unknown error'}`);
                        setExecutionMode('idle');
                      }
                    } catch (e: any) {
                      alert(`Execution failed: ${e.message}`);
                      setExecutionMode('idle');
                    }
                  }}
                  className="px-4 py-1.5 border-2 border-r-0 border-[#00ffcc] bg-[#00ffcc] text-[#161616] font-bold text-sm tracking-widest hover:bg-[#161616] hover:text-[#00ffcc] transition-all uppercase cursor-pointer"
                >
                  EXECUTE
                </button>
                <button 
                  onClick={() => setIsExecuteMenuOpen(!isExecuteMenuOpen)}
                  className="px-2 py-1.5 border-2 border-[#00ffcc] bg-[#00ffcc] text-[#161616] font-bold text-sm hover:bg-[#161616] hover:text-[#00ffcc] transition-all cursor-pointer"
                >
                  ▼
                </button>
              </>
            )}
            
            {isExecuteMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-[#161616] border-2 border-[#333] shadow-lg shadow-black/50 flex flex-col z-50">
                <button 
                  onClick={() => {
                    setIsExecuteMenuOpen(false);
                    // Same as manual execute
                    document.querySelector<HTMLButtonElement>('.border-r-0')?.click();
                  }}
                  className="p-3 text-left text-xs font-bold text-[#e5e5e5] hover:bg-[#333] transition-colors uppercase tracking-wider border-b border-[#333]"
                >
                  Manual Trigger
                </button>
                <button 
                  onClick={() => {
                    setIsExecuteMenuOpen(false);
                    setExecutionMode('waiting');
                    alert(`Listening for webhook requests at: \n\nPOST /api/v1/webhook/${workflowId}`);
                  }}
                  className="p-3 text-left text-xs font-bold text-[#e5e5e5] hover:bg-[#333] transition-colors uppercase tracking-wider"
                >
                  Listen for Webhook
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative bg-[#161616]">
        {showExecutions && (
          <aside className="w-64 border-r-2 border-[#333] bg-[#161616] flex flex-col z-10 overflow-y-auto">
            <div className="p-4 border-b-2 border-[#333]">
              <h2 className="text-[#e5e5e5] font-bold tracking-widest uppercase text-sm">Execution History</h2>
              <button onClick={fetchExecutions} className="mt-2 text-xs text-[#999] hover:text-[#fff] underline uppercase">Refresh</button>
            </div>
            <div className="flex flex-col">
              {executions.map(exec => (
                <div 
                  key={exec.id} 
                  onClick={() => setSelectedExecution(exec)}
                  className={`p-4 border-b border-[#333] cursor-pointer hover:bg-[#222] transition-colors ${selectedExecution?.id === exec.id ? 'bg-[#222] border-l-4 border-l-[#00ffcc]' : ''}`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-xs font-bold uppercase ${exec.status === 'success' ? 'text-[#00ffcc]' : exec.status === 'error' ? 'text-[#ff4444]' : 'text-[#ffcc00]'}`}>
                      {exec.status}
                    </span>
                    <span className="text-[10px] text-[#666]">
                      {exec.mode}
                    </span>
                  </div>
                  <div className="text-xs text-[#999]">
                    {new Date(exec.startedAt).toLocaleString()}
                  </div>
                  {exec.stoppedAt && (
                    <div className="text-[10px] text-[#666] mt-1">
                      Duration: {new Date(exec.stoppedAt).getTime() - new Date(exec.startedAt).getTime()}ms
                    </div>
                  )}
                </div>
              ))}
              {executions.length === 0 && (
                <div className="p-4 text-center text-xs text-[#666]">No executions found</div>
              )}
            </div>
          </aside>
        )}
        
        <main className="flex-1 h-full relative" ref={reactFlowWrapper}>
          {showExecutions && selectedExecution && (
             <div className="absolute top-4 left-4 z-50 bg-[#161616] border-2 border-[#00ffcc] p-2 text-xs font-bold text-[#00ffcc] uppercase shadow-lg shadow-black/50">
               Viewing Execution: {selectedExecution.id.split('-')[1] || selectedExecution.id} <br/>
               <span className="text-[#999] text-[10px]">Click any node to view output data</span>
             </div>
          )}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={showExecutions ? undefined : onNodesChange}
            onEdgesChange={showExecutions ? undefined : onEdgesChange}
            onConnect={showExecutions ? undefined : onConnect}
            onInit={setReactFlowInstance}
            onDrop={showExecutions ? undefined : onDrop}
            onDragOver={showExecutions ? undefined : onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onPaneContextMenu={onPaneContextMenu}
            fitView
            minZoom={0.05}
            maxZoom={4}
            className="n7n-flow"
          >
            <Controls className="!bg-[#161616] !border-[#e5e5e5] !fill-[#e5e5e5]" />
            <MiniMap 
              nodeColor="#333" 
              maskColor="rgba(22, 22, 22, 0.8)" 
              className="!bg-[#161616] !border-2 !border-[#333]" 
            />
            <Background variant={BackgroundVariant.Dots} gap={20} size={2} color="#333333" />
          </ReactFlow>
          {!showExecutions && <NodePicker isOpen={isNodePickerOpen} setIsOpen={setIsNodePickerOpen} onDragStart={onDragStart} onAddNode={onAddNode} />}
        </main>
            {selectedNodeId && (
              <ConfigPanel 
                selectedNode={selectedNode} 
                updateNodeData={updateNodeData} 
                deleteNode={deleteNode} 
                executionData={selectedExecution ? selectedExecution.executionData : executions[0]?.executionData}
                credentials={credentialsList}
                onClose={() => setSelectedNodeId(null)}
              />
            )}</div>
    </div>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeWorkflowId, setActiveWorkflowId] = useState(DEFAULT_WORKFLOW_ID);

  return (
    <div className="w-screen h-screen flex text-[#e5e5e5] font-mono bg-[#161616]">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
        currentView={currentView}
        setView={setCurrentView}
      />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {currentView === 'dashboard' ? (
          <Dashboard onOpenWorkflow={(id) => {
            setActiveWorkflowId(id);
            setCurrentView('workflow');
          }} />
        ) : currentView === 'credentials' ? (
          <CredentialsManager />
        ) : (
          <ReactFlowProvider>
            <FlowBuilder workflowId={activeWorkflowId} />
          </ReactFlowProvider>
        )}
      </div>
    </div>
  );
}
