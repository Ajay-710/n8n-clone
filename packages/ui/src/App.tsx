import { useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
} from 'reactflow';
import type { Connection, Edge } from 'reactflow';
import 'reactflow/dist/style.css';

const initialNodes = [
  { id: '1', position: { x: 250, y: 5 }, data: { label: 'Webhook Trigger' } },
  { id: '2', position: { x: 250, y: 150 }, data: { label: 'HTTP Request' } },
];
const initialEdges = [{ id: 'e1-2', source: '1', target: '2' }];

function App() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div className="w-screen h-screen flex flex-col text-[#e5e5e5] font-mono">
      <header className="h-16 border-b-2 border-[#333] flex items-center px-6 bg-[#161616] z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#e5e5e5] bg-[#161616] flex items-center justify-center">
            <span className="text-[#e5e5e5] font-bold text-xl uppercase">Z</span>
          </div>
          <h1 className="font-bold text-xl tracking-widest text-[#e5e5e5]">Zaggonaut</h1>
        </div>
        
        <div className="ml-auto flex items-center gap-8">
          <nav className="flex gap-4 text-sm font-bold tracking-widest lowercase">
            <a href="#" className="hover:underline underline-offset-4 decoration-2">home</a>
            <a href="#" className="hover:underline underline-offset-4 decoration-2">projects</a>
            <a href="#" className="hover:underline underline-offset-4 decoration-2">blog</a>
          </nav>

          <button 
            onClick={async () => {
              try {
                const res = await fetch('/api/v1/workflows/test-wf-id/execute', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ startingNodeId: '1', mode: 'manual' })
                });
                const data = await res.json();
                alert(`Execution started! Job ID: ${data.executionId}\nStatus: ${data.status}`);
              } catch (e: any) {
                alert(`Execution failed: ${e.message}`);
              }
            }}
            className="px-4 py-1.5 border-2 border-[#e5e5e5] bg-[#e5e5e5] text-[#161616] font-bold text-sm tracking-widest hover:bg-[#161616] hover:text-[#e5e5e5] transition-all uppercase"
          >
            EXECUTE
          </button>
        </div>
      </header>
      <main className="flex-1 relative bg-[#161616]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
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
  );
}

export default App;
