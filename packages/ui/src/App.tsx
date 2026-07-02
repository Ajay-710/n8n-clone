import React, { useCallback, useRef, useState } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  ReactFlowProvider,
  ReactFlowInstance,
  Connection,
  Edge,
  Node
} from 'reactflow';
import 'reactflow/dist/style.css';

const initialNodes: Node[] = [
  { id: '1', type: 'default', position: { x: 250, y: 5 }, data: { label: 'Webhook Trigger' } },
];
const initialEdges: Edge[] = [];

let id = 10;
const getId = () => `node_${id++}`;

function Sidebar() {
  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-64 border-r-2 border-[#333] bg-[#161616] p-4 flex flex-col gap-4 z-10">
      <h2 className="text-[#e5e5e5] font-bold tracking-widest uppercase mb-4 text-center border-b-2 border-[#333] pb-2">Nodes</h2>
      
      <div className="text-[#e5e5e5] text-xs mb-2">Drag nodes to canvas:</div>
      
      <div 
        className="border-2 border-[#e5e5e5] bg-[#161616] text-[#e5e5e5] p-3 text-sm font-bold cursor-grab hover:bg-[#e5e5e5] hover:text-[#161616] transition-all uppercase text-center"
        onDragStart={(event) => onDragStart(event, 'default', 'HTTP Request')}
        draggable
      >
        HTTP Request
      </div>
      
      <div 
        className="border-2 border-[#e5e5e5] bg-[#161616] text-[#e5e5e5] p-3 text-sm font-bold cursor-grab hover:bg-[#e5e5e5] hover:text-[#161616] transition-all uppercase text-center"
        onDragStart={(event) => onDragStart(event, 'default', 'AIAgent')}
        draggable
      >
        AI Agent
      </div>

      <div 
        className="border-2 border-[#e5e5e5] bg-[#161616] text-[#e5e5e5] p-3 text-sm font-bold cursor-grab hover:bg-[#e5e5e5] hover:text-[#161616] transition-all uppercase text-center"
        onDragStart={(event) => onDragStart(event, 'default', 'Set')}
        draggable
      >
        Set Data
      </div>
    </aside>
  );
}

function FlowBuilder() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

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
        type,
        position,
        data: { label },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes],
  );

  return (
    <div className="w-screen h-screen flex flex-col text-[#e5e5e5] font-mono">
      <header className="h-16 border-b-2 border-[#333] flex items-center px-6 bg-[#161616] z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#e5e5e5] bg-[#161616] flex items-center justify-center">
            <span className="text-[#e5e5e5] font-bold text-xl uppercase">Z</span>
          </div>
          <h1 className="font-bold text-xl tracking-widest text-[#e5e5e5]">Zaggonaut</h1>
        </div>
        
        <div className="ml-auto flex items-center gap-8">
          <nav className="flex gap-4 text-sm font-bold tracking-widest lowercase">
            <span className="text-[#666] cursor-not-allowed">home</span>
            <span className="text-[#666] cursor-not-allowed">projects</span>
            <span className="text-[#666] cursor-not-allowed">blog</span>
          </nav>

          <button 
            onClick={async () => {
              try {
                // Map React Flow nodes/edges to our engine format
                const engineNodes = nodes.map(n => ({
                  id: n.id,
                  type: n.data.label.replace(/\s+/g, ''), // e.g. "HTTP Request" -> "HTTPRequest"
                  parameters: {}
                }));
                const engineConnections = edges.map(e => ({
                  source: e.source,
                  target: e.target
                }));

                const res = await fetch('/api/v1/workflows/test-wf-id/execute', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    startingNodeId: '1', 
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
        <Sidebar />
        
        <main className="flex-1 h-full relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            fitView
            className="zaggonaut-flow"
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
