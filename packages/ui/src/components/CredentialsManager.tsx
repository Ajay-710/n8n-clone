import { useState, useEffect } from 'react';

const INTEGRATIONS = [
  { id: 'Anthropic', name: 'Anthropic API', icon: '🤖' },
  { id: 'OpenAI', name: 'OpenAI API', icon: '🧠' },
  { id: 'Apify', name: 'Apify API', icon: '🕷️' },
  { id: 'Slack', name: 'Slack API', icon: '💬' },
  { id: 'Postgres', name: 'PostgreSQL', icon: '🐘' },
  { id: 'GoogleSheets', name: 'Google Sheets OAuth2 API', icon: '📊' },
  { id: 'Generic', name: 'Custom Auth', icon: '🔑' },
];

export default function CredentialsManager() {
  const [credentials, setCredentials] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [creationStep, setCreationStep] = useState(1); // 1: Select Type, 2: Fill Form
  const [formData, setFormData] = useState({ name: '', type: 'Anthropic', apiKey: '' });
  const [searchQuery, setSearchQuery] = useState('');

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
    setCreationStep(1);
    setFormData({ name: '', type: 'Anthropic', apiKey: '' });
    fetchCredentials();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this credential?')) return;
    await fetch(`/api/v1/credentials/${id}`, { method: 'DELETE' });
    fetchCredentials();
  };

  const getIcon = (type: string) => {
    const integration = INTEGRATIONS.find(i => i.id === type);
    return integration ? integration.icon : '🔑';
  };

  const filteredIntegrations = INTEGRATIONS.filter(i => 
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 bg-[#161616] flex justify-center text-[#e5e5e5] font-mono h-full overflow-hidden relative">
      {/* Main View */}
      <div className="w-full max-w-7xl p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-8 pb-4">
          <h1 className="text-2xl font-bold tracking-widest uppercase text-[#e5e5e5]">Credentials</h1>
          <button 
            onClick={() => { setIsCreating(true); setCreationStep(1); }}
            className="px-4 py-2 border-2 border-[#ff6d55] bg-[#ff6d55]/10 text-[#ff6d55] font-bold uppercase tracking-widest hover:bg-[#ff6d55] hover:text-[#161616] transition-colors cursor-pointer flex items-center gap-2"
          >
            <span>+ Add Credential</span>
          </button>
        </div>

        {credentials.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 border-2 border-dashed border-[#333] p-12 text-center">
            <div className="text-4xl mb-4">🔑</div>
            <h2 className="text-xl font-bold uppercase tracking-widest mb-2">No credentials yet</h2>
            <p className="text-sm text-[#999] max-w-md">
              Add credentials to authenticate your nodes with third-party services.
            </p>
          </div>
        ) : (
          <div className="w-full border-2 border-[#333] bg-[#111] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-[#333] bg-[#222]">
                  <th className="p-4 text-xs font-bold text-[#999] uppercase tracking-widest">Name</th>
                  <th className="p-4 text-xs font-bold text-[#999] uppercase tracking-widest">Type</th>
                  <th className="p-4 text-xs font-bold text-[#999] uppercase tracking-widest">Created At</th>
                  <th className="p-4 text-xs font-bold text-[#999] uppercase tracking-widest w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {credentials.map(cred => (
                  <tr key={cred.id} className="border-b border-[#333] hover:bg-[#1a1a1a] transition-colors group">
                    <td className="p-4 flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center border-2 border-[#333] bg-[#222] text-sm">
                        {getIcon(cred.type)}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-[#e5e5e5]">{cred.name}</div>
                        <div className="text-[10px] text-[#666] uppercase">{cred.id}</div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-[#e5e5e5]">
                      {INTEGRATIONS.find(i => i.id === cred.type)?.name || cred.type}
                    </td>
                    <td className="p-4 text-sm text-[#999]">
                      {new Date(cred.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <button 
                        onClick={() => handleDelete(cred.id)}
                        className="text-[#ff4444] text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Credential Slide-over / Modal */}
      {isCreating && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-8 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl h-[85vh] bg-[#161616] flex flex-col border border-[#333] shadow-2xl overflow-hidden animate-in slide-in-from-right-8 duration-200">
            {/* Modal Header */}
            <header className="h-16 border-b-2 border-[#333] flex items-center px-6 shrink-0 justify-between bg-[#111]">
              <div className="flex items-center gap-4">
                <h2 className="font-bold text-[#e5e5e5] tracking-widest uppercase">
                  {creationStep === 1 ? 'Select App' : 'Set up Credential'}
                </h2>
              </div>
              <button 
                onClick={() => setIsCreating(false)} 
                className="p-2 border-2 border-[#333] text-[#e5e5e5] hover:bg-[#333] transition-colors" 
                title="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </header>

            {creationStep === 1 ? (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="mb-6">
                  <input 
                    type="text" 
                    placeholder="Search apps..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#111] border-2 border-[#333] p-4 text-sm text-[#e5e5e5] outline-none focus:border-[#ff6d55] transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {filteredIntegrations.map(integration => (
                    <div 
                      key={integration.id}
                      onClick={() => {
                        setFormData({ ...formData, type: integration.id, name: `My ${integration.name}` });
                        setCreationStep(2);
                      }}
                      className="border-2 border-[#333] bg-[#222] p-6 hover:border-[#ff6d55] hover:text-[#ff6d55] transition-colors flex flex-col items-center gap-3 cursor-pointer group"
                    >
                      <div className="text-3xl grayscale group-hover:grayscale-0 transition-all">{integration.icon}</div>
                      <div className="text-sm font-bold text-center">{integration.name}</div>
                    </div>
                  ))}
                  {filteredIntegrations.length === 0 && (
                    <div className="col-span-full text-center text-[#666] py-12 uppercase tracking-widest text-xs">
                      No matching apps found.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                <button 
                  onClick={() => setCreationStep(1)}
                  className="text-xs text-[#999] hover:text-[#e5e5e5] uppercase tracking-widest flex items-center gap-2 self-start"
                >
                  &larr; Back to apps
                </button>
                
                <div className="flex items-center gap-4 mb-4 pb-4 border-b-2 border-[#333]">
                  <div className="w-12 h-12 flex items-center justify-center border-2 border-[#333] bg-[#222] text-2xl">
                    {getIcon(formData.type)}
                  </div>
                  <div>
                    <h3 className="font-bold text-xl">{INTEGRATIONS.find(i => i.id === formData.type)?.name}</h3>
                    <div className="text-xs text-[#999] uppercase tracking-widest">Setup Configuration</div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#999] uppercase mb-2">Credential Name</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#111] border-2 border-[#333] p-3 text-sm text-[#e5e5e5] outline-none focus:border-[#ff6d55] transition-colors"
                    placeholder="My custom credential name"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-[#999] uppercase mb-2">API Key / Secret</label>
                  <input 
                    type="password" 
                    value={formData.apiKey}
                    onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
                    className="w-full bg-[#111] border-2 border-[#333] p-3 text-sm text-[#e5e5e5] outline-none focus:border-[#ff6d55] transition-colors"
                    placeholder="Enter your secret token or key..."
                  />
                  <p className="text-[10px] text-[#666] mt-2 italic">Stored securely in the orchestrator vault.</p>
                </div>

                <div className="mt-auto pt-6 border-t-2 border-[#333] flex justify-end">
                  <button 
                    onClick={handleSave}
                    className="px-8 py-3 bg-[#ff6d55] text-[#161616] font-bold uppercase tracking-widest hover:bg-[#ff8a75] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!formData.name || !formData.apiKey}
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
