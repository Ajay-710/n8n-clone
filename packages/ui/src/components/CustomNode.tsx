import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';

const typeIcons: Record<string, string> = {
  Webhook: '⚡',
  HTTPRequest: '🌐',
  AIAgent: '🧠',
  Set: '🔧',
  IF: '🔀',
  default: '📦'
};

const typeColors: Record<string, string> = {
  Webhook: 'border-[#ff00ff] text-[#ff00ff]',
  HTTPRequest: 'border-[#00ffcc] text-[#00ffcc]',
  AIAgent: 'border-[#ffaa00] text-[#ffaa00]',
  Set: 'border-[#3399ff] text-[#3399ff]',
  IF: 'border-[#ff4444] text-[#ff4444]',
  default: 'border-[#e5e5e5] text-[#e5e5e5]'
};

export default function CustomNode({ data, selected, isConnectable }: NodeProps) {
  const type = data.type || 'default';
  const label = data.label || 'Node';
  const icon = typeIcons[type] || typeIcons.default;
  const colorClass = typeColors[type] || typeColors.default;
  
  // Custom execution status classes passed via className from App.tsx
  // We can extract it if we pass it in data, but App.tsx overrides className directly.
  // Actually, React Flow merges custom className on the wrapper, so we just design the interior here.

  return (
    <div className={`
      relative min-w-[200px] bg-[#161616] border-2 flex items-center shadow-lg transition-all
      ${selected ? 'border-[#00ffcc] shadow-[0_0_15px_rgba(0,255,204,0.3)]' : 'border-[#333] hover:border-[#666]'}
    `}>
      {/* Input Handle */}
      {type !== 'Webhook' && (
        <Handle 
          type="target" 
          position={Position.Left} 
          isConnectable={isConnectable}
          className="!w-3 !h-6 !bg-[#333] !border-2 !border-[#161616] !rounded-none -ml-[2px]"
        />
      )}

      {/* Node Icon */}
      <div className={`w-12 h-12 flex items-center justify-center border-r-2 border-[#333] bg-[#111] text-xl ${colorClass.split(' ')[1]}`}>
        {icon}
      </div>

      {/* Node Content */}
      <div className="flex-1 p-3 flex flex-col justify-center">
        <div className="text-xs font-bold text-[#e5e5e5] uppercase tracking-wider truncate">
          {label}
        </div>
        <div className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${colorClass.split(' ')[1]}`}>
          {type}
        </div>
      </div>

      {/* Node Status Indicator (Running, Success, Error) */}
      {/* This can be driven by data.status if we choose to pass it, but for now we rely on the wrapper className applied in App.tsx */}

      {/* Output Handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        isConnectable={isConnectable}
        className="!w-3 !h-6 !bg-[#333] !border-2 !border-[#161616] !rounded-none -mr-[2px]"
      />
    </div>
  );
}
