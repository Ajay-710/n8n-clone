import { useState, useEffect } from 'react';

export default function CredentialsManager() {
  const [credentials, setCredentials] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'Anthropic', apiKey: '' });

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    const res = await fetch('/api/v1/credentials');
    const data = await res.json();
    if (data.status === 'success') {
      setCredentials(data.data);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.apiKey) return;

    await fetch('/api/v1/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.name,
        type: formData.type,
        data: { apiKey: formData.apiKey }
      })
    });
    setIsCreating(false);
    setFormData({ name: '', type: 'Anthropic', apiKey: '' });
    fetchCredentials();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this credential?')) return;
    await fetch(`/api/v1/credentials/${id}`, { method: 'DELETE' });
    fetchCredentials();
  };

  return (
    <div className="flex-1 bg-[#161616] p-8 overflow-y-auto text-[#e5e5e5] font-mono h-full">
      <div className="flex justify-between items-center mb-12 border-b-2 border-[#333] pb-4">
        <h1 className="text-3xl font-bold tracking-widest uppercase text-[#e5e5e5]">Credentials Vault</h1>
        <button 
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 border-2 border-[#00ffcc] bg-[#00ffcc]/10 text-[#00ffcc] font-bold uppercase tracking-widest hover:bg-[#00ffcc] hover:text-[#161616] transition-colors cursor-pointer"
        >
          + Add Credential
        </button>
      </div>

      {isCreating && (
        <div className="mb-10 bg-[#222] border-2 border-[#333] p-6 max-w-2xl">
          <h2 className="text-xl font-bold text-[#e5e5e5] uppercase mb-6 tracking-widest">New Credential</h2>
          
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-[#999] uppercase mb-1">Credential Name</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-[#111] border-2 border-[#333] p-2 text-sm text-[#e5e5e5] outline-none focus:border-[#00ffcc]"
                placeholder="e.g. My Anthropic Key"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-[#999] uppercase mb-1">Type</label>
              <select 
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                className="w-full bg-[#111] border-2 border-[#333] p-2 text-sm text-[#e5e5e5] outline-none focus:border-[#00ffcc]"
              >
                <option value="Anthropic">Anthropic API</option>
                <option value="OpenAI">OpenAI API</option>
                <option value="Apify">Apify Token</option>
                <option value="Generic">Generic API Key</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#999] uppercase mb-1">API Key / Secret</label>
              <input 
                type="password" 
                value={formData.apiKey}
                onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
                className="w-full bg-[#111] border-2 border-[#333] p-2 text-sm text-[#e5e5e5] outline-none focus:border-[#00ffcc]"
                placeholder="sk-..."
              />
              <p className="text-[10px] text-[#666] mt-2 italic">Stored using AES-256 encryption.</p>
            </div>

            <div className="flex gap-4 mt-4">
              <button 
                onClick={handleSave}
                className="px-6 py-2 bg-[#e5e5e5] text-[#161616] font-bold uppercase tracking-widest hover:bg-[#00ffcc] transition-colors"
              >
                Save
              </button>
              <button 
                onClick={() => setIsCreating(false)}
                className="px-6 py-2 border-2 border-[#333] text-[#999] font-bold uppercase tracking-widest hover:text-[#e5e5e5] hover:border-[#666] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {credentials.map(cred => (
          <div key={cred.id} className="border-2 border-[#333] bg-[#222] p-6 hover:border-[#666] transition-colors flex flex-col gap-4 relative group">
            <button 
              onClick={() => handleDelete(cred.id)}
              className="absolute top-4 right-4 text-[#ff4444] opacity-0 group-hover:opacity-100 transition-opacity font-bold uppercase text-xs"
            >
              Delete
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border-2 border-[#333] bg-[#111] flex items-center justify-center font-bold text-lg">
                {cred.type === 'Anthropic' ? '🤖' : cred.type === 'OpenAI' ? '🧠' : cred.type === 'Apify' ? '🕷️' : '🔑'}
              </div>
              <div>
                <h3 className="font-bold text-lg text-[#e5e5e5]">{cred.name}</h3>
                <div className="text-[10px] text-[#999] uppercase tracking-widest">{cred.type}</div>
              </div>
            </div>
            <div className="mt-2 text-xs text-[#666]">
              ID: {cred.id}
            </div>
          </div>
        ))}
        
        {credentials.length === 0 && !isCreating && (
          <div className="col-span-full text-center p-12 border-2 border-dashed border-[#333] text-[#666] uppercase tracking-widest text-sm">
            No credentials configured. Add one to securely use AI and API nodes.
          </div>
        )}
      </div>
    </div>
  );
}
