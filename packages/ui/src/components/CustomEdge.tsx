import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  EdgeProps,
  useReactFlow
} from 'reactflow';

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = () => {
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  const onAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Dispatch a custom event to App.tsx to handle node insertion
    const event = new CustomEvent('n7n-insert-node', { detail: { edgeId: id, x: labelX, y: labelY } });
    window.dispatchEvent(event);
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, strokeWidth: selected ? 3 : 2, stroke: selected ? '#00ffcc' : '#555' }} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
            display: 'flex',
            gap: '4px',
            opacity: selected ? 1 : 0,
            transition: 'opacity 0.2s',
          }}
          className="nodrag nopan custom-edge-controls"
        >
          <button
            className="w-6 h-6 bg-[#161616] border-2 border-[#ff4444] text-[#ff4444] rounded-full flex items-center justify-center hover:bg-[#ff4444] hover:text-[#161616] transition-colors shadow-lg cursor-pointer font-bold pb-0.5"
            onClick={(e) => { e.stopPropagation(); onEdgeClick(); }}
            title="Delete Wire"
          >
            ×
          </button>
          <button
            className="w-6 h-6 bg-[#161616] border-2 border-[#00ffcc] text-[#00ffcc] rounded-full flex items-center justify-center hover:bg-[#00ffcc] hover:text-[#161616] transition-colors shadow-lg cursor-pointer font-bold pb-0.5"
            onClick={onAddClick}
            title="Add Node Between"
          >
            +
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
