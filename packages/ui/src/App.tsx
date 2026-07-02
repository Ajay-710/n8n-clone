import React, { useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';

const initialNodes = [
  { id: '1', position: { x: 250, y: 5 }, data: { label: 'Webhook Trigger' } },
  { id: '2', position: { x: 250, y: 150 }, data: { label: 'HTTP Request' } },
];
const initialEdges = [{ id: 'e1-2', source: '1', target: '2' }];

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div className="w-screen h-screen flex flex-col dark text-foreground">
      <header className="h-16 border-b border-[#22d3ee]/20 flex items-center px-6 bg-[#120d20]/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#c026d3] to-[#22d3ee] flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.5)]">
            <span className="text-white font-bold text-lg">Z</span>
          </div>
          <h1 className="font-bold text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white to-[#22d3ee]">ZAGGONAUT ORCHESTRATOR</h1>
        </div>
        
        <div className="ml-auto">
          <button 
            onClick={async () => {
              try {
                const res = await fetch('http://localhost:3000/api/v1/workflows/test-wf-id/execute', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ startingNodeId: '1', mode: 'manual' })
                });
                const data = await res.json();
                alert(`Execution started! Job ID: ${data.executionId}\nStatus: ${data.status}`);
              } catch (e) {
                alert(`Execution failed: ${e.message}`);
              }
            }}
            className="px-4 py-2 rounded-md bg-[#22d3ee] text-[#09090b] font-bold text-sm tracking-wide shadow-[0_0_15px_rgba(34,211,238,0.4)] hover:shadow-[0_0_25px_rgba(34,211,238,0.8)] transition-all"
          >
            EXECUTE WORKFLOW
          </button>
        </div>
      </header>
      <main className="flex-1 relative bg-transparent">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          className="zaggonaut-flow"
        >
          <Controls className="!bg-[#120d20] !border-[#22d3ee]/30 !fill-[#22d3ee]" />
          <MiniMap 
            nodeColor="#c026d3" 
            maskColor="rgba(18, 13, 32, 0.8)" 
            className="!bg-[#09090b] !border-[#22d3ee]/30" 
          />
          <Background variant="dots" gap={20} size={1.5} color="rgba(34,211,238,0.15)" />
        </ReactFlow>
      </main>
    </div>
  );
}

export default App;
