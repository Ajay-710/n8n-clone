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
import 'reactflow/dist/style.css';

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
          onClick={() => setView('workflow')}
          className={`p-3 text-sm font-bold tracking-widest uppercase text-left transition-all ${currentView === 'workflow' ? 'bg-[#e5e5e5] text-[#161616]' : 'text-[#999] hover:bg-[#333] hover:text-[#e5e5e5]'}`}
        >
          Editor View
        </button>
      </nav>
    </aside>
  );
}

function NodePicker({ onDragStart }: { onDragStart: (event: React.DragEvent, type: string, label: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute bottom-8 right-[340px] z-50 flex flex-col items-end gap-4">
      {isOpen && (
        <div className="w-64 bg-[#161616] border-2 border-[#333] p-4 shadow-lg shadow-black/50 max-h-96 overflow-y-auto">
          <h3 className="text-[#e5e5e5] font-bold tracking-widest uppercase mb-4 text-xs border-b-2 border-[#333] pb-2">Add Node</h3>
          <div className="flex flex-col gap-2">
            {[
              { type: 'Webhook', label: 'Webhook Trigger' },
              { type: 'HTTPRequest', label: 'HTTP Request' },
              { type: 'AIAgent', label: 'AI Agent' },
              { type: 'Set', label: 'Set Data' },
              { type: 'IF', label: 'IF Condition' }
            ].map(node => (
              <div 
                key={node.type}
                className="border-2 border-[#333] bg-[#222] text-[#e5e5e5] p-2 text-xs font-bold cursor-grab hover:bg-[#e5e5e5] hover:text-[#161616] transition-all uppercase text-center"
                onDragStart={(event) => onDragStart(event, node.type, node.label)}
                draggable
              >
                {node.label}
              </div>
            ))}
          </div>
        </div>
      )}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-[#161616] text-[#e5e5e5] rounded-none border-2 border-[#e5e5e5] font-bold text-3xl hover:bg-[#e5e5e5] hover:text-[#161616] transition-all shadow-lg flex items-center justify-center pb-1 cursor-pointer"
        title="Add Nodes"
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
        <button className="px-4 py-2 border-2 border-[#e5e5e5] bg-[#e5e5e5] text-[#161616] font-bold uppercase tracking-widest hover:bg-[#161616] hover:text-[#e5e5e5] transition-colors cursor-pointer">
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
  executionData
}: { 
  selectedNode: Node | null, 
  updateNodeData: (id: string, key: string, value: any) => void, 
  deleteNode: (id: string) => void,
  executionData?: Record<string, any>
}) {
  if (!selectedNode) {
    return (
      <aside className="w-80 border-l-2 border-[#333] bg-[#161616] p-4 flex flex-col gap-4 z-10 shrink-0">
        <h2 className="text-[#e5e5e5] font-bold tracking-widest uppercase mb-4 text-center border-b-2 border-[#333] pb-2">Config</h2>
        <div className="text-[#666] text-sm text-center mt-10">Select a node to configure</div>
      </aside>
    );
  }

  const { id, type, data } = selectedNode;
  const parameters = data.parameters || {};
  const outputData = executionData ? executionData[id] : null;

  return (
    <aside className="w-80 border-l-2 border-[#333] bg-[#161616] p-4 flex flex-col gap-4 z-10 overflow-y-auto relative shrink-0">
      <h2 className="text-[#e5e5e5] font-bold tracking-widest uppercase mb-4 text-center border-b-2 border-[#333] pb-2">
        {executionData ? 'Execution Output' : 'Config: ' + data.label}
      </h2>

      {executionData ? (
        <div className="flex flex-col gap-2 h-full">
          <label className="text-xs font-bold text-[#e5e5e5] uppercase tracking-wider">Node ID: {id}</label>
          <div className="mt-2 text-xs font-bold text-[#00ffcc] uppercase tracking-wider">JSON Output</div>
          <div className="flex-1 bg-[#111] border-2 border-[#333] p-2 overflow-auto text-xs text-[#e5e5e5] font-mono whitespace-pre-wrap">
            {outputData ? JSON.stringify(outputData.json, null, 2) : 'No output data for this node in this execution.'}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[#e5e5e5] uppercase tracking-wider">Node ID</label>
            <input type="text" readOnly value={id} className="bg-[#222] border-2 border-[#333] p-2 text-sm text-[#999] outline-none" />
          </div>

          {type === 'HTTPRequest' && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#e5e5e5] uppercase tracking-wider">Method</label>
                <select 
                  value={parameters.method || 'GET'} 
                  onChange={(e) => updateNodeData(id, 'method', e.target.value)}
                  className="bg-[#161616] border-2 border-[#e5e5e5] p-2 text-sm text-[#e5e5e5] outline-none font-mono uppercase"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#e5e5e5] uppercase tracking-wider">URL</label>
                <input 
                  type="text" 
                  value={parameters.url || ''} 
                  onChange={(e) => updateNodeData(id, 'url', e.target.value)}
                  placeholder="https://api.example.com" 
                  className="bg-[#161616] border-2 border-[#e5e5e5] p-2 text-sm text-[#e5e5e5] outline-none font-mono" 
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#e5e5e5] uppercase tracking-wider">Body (JSON)</label>
                <textarea 
                  rows={4}
                  value={parameters.body || ''} 
                  onChange={(e) => updateNodeData(id, 'body', e.target.value)}
                  className="bg-[#161616] border-2 border-[#e5e5e5] p-2 text-sm text-[#e5e5e5] outline-none font-mono" 
                />
              </div>
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
                className="bg-[#161616] border-2 border-[#e5e5e5] p-2 text-sm text-[#e5e5e5] outline-none font-mono" 
              />
            </div>
          )}

          {type === 'Set' && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[#e5e5e5] uppercase tracking-wider">Value (JSON)</label>
              <textarea 
                rows={5}
                value={parameters.value || ''} 
                onChange={(e) => updateNodeData(id, 'value', e.target.value)}
                placeholder='{"key": "value"}'
                className="bg-[#161616] border-2 border-[#e5e5e5] p-2 text-sm text-[#e5e5e5] outline-none font-mono" 
              />
            </div>
          )}

          <button 
            onClick={() => deleteNode(id)}
            className="mt-8 px-4 py-2 border-2 border-[#ff4444] text-[#ff4444] font-bold text-sm tracking-widest hover:bg-[#ff4444] hover:text-[#161616] transition-all uppercase cursor-pointer"
          >
            DELETE NODE
          </button>
        </>
      )}
    </aside>
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
  }, [workflowId, setNodes, setEdges]);

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

          <button 
            onClick={async () => {
              try {
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
                alert(`Execution started! Job ID: ${data.executionId}\nStatus: ${data.status}`);
              } catch (e: any) {
                alert(`Execution failed: ${e.message}`);
              }
            }}
            className="px-4 py-1.5 border-2 border-[#e5e5e5] bg-[#e5e5e5] text-[#161616] font-bold text-sm tracking-widest hover:bg-[#161616] hover:text-[#e5e5e5] transition-all uppercase cursor-pointer"
          >
            EXECUTE
          </button>
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
            onNodesChange={showExecutions ? undefined : onNodesChange}
            onEdgesChange={showExecutions ? undefined : onEdgesChange}
            onConnect={showExecutions ? undefined : onConnect}
            onInit={setReactFlowInstance}
            onDrop={showExecutions ? undefined : onDrop}
            onDragOver={showExecutions ? undefined : onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
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
          {!showExecutions && <NodePicker onDragStart={onDragStart} />}
        </main>
        
        <ConfigPanel 
          selectedNode={selectedNode} 
          updateNodeData={updateNodeData} 
          deleteNode={deleteNode} 
          executionData={showExecutions && selectedExecution ? selectedExecution.executionData : undefined}
        />
      </div>
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
        ) : (
          <ReactFlowProvider>
            <FlowBuilder workflowId={activeWorkflowId} />
          </ReactFlowProvider>
        )}
      </div>
    </div>
  );
}
