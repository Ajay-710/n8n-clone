import type { NodeProps } from 'reactflow';

export default function StickyNode({ data, selected }: NodeProps) {
  return (
    <div className={`w-64 h-64 bg-[#fff9c4] border-2 shadow-lg flex flex-col p-2 transition-all ${selected ? 'border-[#ffb300]' : 'border-transparent hover:border-[#ffb300]'}`}>
      <div className="w-full flex-1 relative">
        <textarea
          className="w-full h-full bg-transparent resize-none outline-none text-[#333] font-sans text-sm placeholder:text-[#999]"
          defaultValue={data.label || ''}
          placeholder="Type notes here..."
          onChange={(e) => {
            // Keep local state in sync but don't strictly trigger reactflow updates on every stroke to avoid performance hits
            data.label = e.target.value;
          }}
        />
      </div>
    </div>
  );
}
