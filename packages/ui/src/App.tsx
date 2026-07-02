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

const WORKFLOW_ID = 'default-workflow';

function Sidebar() {
  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-64 border-r-2 border-[#333] bg-[#161616] p-4 flex flex-col gap-4 z-10 overflow-y-auto">
      <h2 className="text-[#e5e5e5] font-bold tracking-widest uppercase mb-4 text-center border-b-2 border-[#333] pb-2">Nodes</h2>
      
      <div className="text-[#e5e5e5] text-xs mb-2">Drag nodes to canvas:</div>
      
      <div 
        className="border-2 border-[#e5e5e5] bg-[#161616] text-[#e5e5e5] p-3 text-sm font-bold cursor-grab hover:bg-[#e5e5e5] hover:text-[#161616] transition-all uppercase text-center"
        onDragStart={(event) => onDragStart(event, 'Webhook', 'Webhook Trigger')}
        draggable
      >
        Webhook Trigger
      </div>

      <div 
        className="border-2 border-[#e5e5e5] bg-[#161616] text-[#e5e5e5] p-3 text-sm font-bold cursor-grab hover:bg-[#e5e5e5] hover:text-[#161616] transition-all uppercase text-center"
        onDragStart={(event) => onDragStart(event, 'HTTPRequest', 'HTTP Request')}
        draggable
      >
        HTTP Request
      </div>
      
      <div 
        className="border-2 border-[#e5e5e5] bg-[#161616] text-[#e5e5e5] p-3 text-sm font-bold cursor-grab hover:bg-[#e5e5e5] hover:text-[#161616] transition-all uppercase text-center"
        onDragStart={(event) => onDragStart(event, 'AIAgent', 'AI Agent')}
        draggable
      >
        AI Agent
      </div>

      <div 
        className="border-2 border-[#e5e5e5] bg-[#161616] text-[#e5e5e5] p-3 text-sm font-bold cursor-grab hover:bg-[#e5e5e5] hover:text-[#161616] transition-all uppercase text-center"
        onDragStart={(event) => onDragStart(event, 'Set', 'Set Data')}
        draggable
      >
        Set Data
      </div>

      <div 
        className="border-2 border-[#e5e5e5] bg-[#161616] text-[#e5e5e5] p-3 text-sm font-bold cursor-grab hover:bg-[#e5e5e5] hover:text-[#161616] transition-all uppercase text-center"
        onDragStart={(event) => onDragStart(event, 'IF', 'IF Condition')}
        draggable
      >
        IF Condition
      </div>
    </aside>
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
      <aside className="w-80 border-l-2 border-[#333] bg-[#161616] p-4 flex flex-col gap-4 z-10">
        <h2 className="text-[#e5e5e5] font-bold tracking-widest uppercase mb-4 text-center border-b-2 border-[#333] pb-2">Config</h2>
        <div className="text-[#666] text-sm text-center mt-10">Select a node to configure</div>
      </aside>
    );
  }

  const { id, type, data } = selectedNode;
  const parameters = data.parameters || {};
  const outputData = executionData ? executionData[id] : null;

  return (
    <aside className="w-80 border-l-2 border-[#333] bg-[#161616] p-4 flex flex-col gap-4 z-10 overflow-y-auto relative">
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

function FlowBuilder() {
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
    fetch(`/api/v1/workflows/${WORKFLOW_ID}`)
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
  }, [setNodes, setEdges]);

  const fetchExecutions = () => {
    fetch(`/api/v1/workflows/${WORKFLOW_ID}/executions`)
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
      await fetch(`/api/v1/workflows/${WORKFLOW_ID}`, {
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
          // Attempt to parse n8n connections format if possible
          // For now, basic fallback to empty edges if no edges array
          newEdges = [];
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

  return (
    <div className="w-screen h-screen flex flex-col text-[#e5e5e5] font-mono">
      <header className="h-16 border-b-2 border-[#333] flex items-center px-6 bg-[#161616] z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#e5e5e5] bg-[#161616] flex items-center justify-center">
            <span className="text-[#e5e5e5] font-bold text-xl uppercase">N</span>
          </div>
          <h1 className="font-bold text-xl tracking-widest text-[#e5e5e5]">n7n</h1>
        </div>
        
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

                // Find webhook trigger to start from
                const triggerNode = engineNodes.find(n => n.type === 'Webhook');
                const startId = triggerNode ? triggerNode.id : engineNodes[0]?.id;

                if (!startId) return alert('Add nodes to execute');

                const res = await fetch(`/api/v1/workflows/${WORKFLOW_ID}/execute`, {
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
        {showExecutions ? (
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
        ) : (
          <Sidebar />
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
  return (
    <ReactFlowProvider>
      <FlowBuilder />
    </ReactFlowProvider>
  );
}
