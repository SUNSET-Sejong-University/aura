/**
 * AURA Dashboard – Main App
 */
import { useEffect, useState } from 'react';
import LiveFeed from './components/LiveFeed';
import WorkflowBuilder from './components/WorkflowBuilder';
import Analytics from './components/Analytics';
import DeviceList from './components/DeviceList';

const API = '/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}

export default function App() {
  const [tags,      setTags]      = useState<{ uid: string; label: string }[]>([]);
  const [workflows, setWorkflows] = useState<{ id: number; name: string; tag_uid: string; url: string; event_type: string; enabled: boolean }[]>([]);
  const [devices,   setDevices]   = useState<{ id: string; name: string; ip_address: string | null; last_seen: number | null; paired: number }[]>([]);
  const [heatmap,   setHeatmap]   = useState<{ tag_uid: string; hour: number; count: number }[]>([]);
  const [activeTab, setActiveTab] = useState<'live' | 'workflows' | 'analytics' | 'devices'>('live');

  // Fetch initial data
  useEffect(() => {
    void apiFetch<typeof tags>('/tags').then(setTags).catch(console.error);
    void apiFetch<typeof workflows>('/workflows').then(setWorkflows).catch(console.error);
    void apiFetch<typeof devices>('/devices').then(setDevices).catch(console.error);
    void apiFetch<typeof heatmap>('/logs/analytics/heatmap').then(setHeatmap).catch(console.error);
  }, []);

  async function handleAddWorkflow(wf: Omit<typeof workflows[0], 'id'>) {
    const created = await apiFetch<typeof workflows[0]>('/workflows', {
      method: 'POST',
      body:   JSON.stringify(wf),
    });
    setWorkflows(prev => [...prev, created]);
  }

  async function handleDeleteWorkflow(id: number) {
    await apiFetch(`/workflows/${id}`, { method: 'DELETE' });
    setWorkflows(prev => prev.filter(w => w.id !== id));
  }

  async function handleToggleWorkflow(id: number, enabled: boolean) {
    const updated = await apiFetch<typeof workflows[0]>(`/workflows/${id}`, {
      method: 'PATCH',
      body:   JSON.stringify({ enabled }),
    });
    setWorkflows(prev => prev.map(w => w.id === id ? updated : w));
  }

  async function handlePairDevice(id: string) {
    await apiFetch(`/devices/${id}`, { method: 'PATCH', body: JSON.stringify({ paired: true }) });
    setDevices(prev => prev.map(d => d.id === id ? { ...d, paired: 1 } : d));
  }

  const tabs = [
    { id: 'live',      label: 'Live Feed' },
    { id: 'workflows', label: 'Workflows' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'devices',   label: 'Devices' },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-indigo-400">AURA</h1>
          <p className="text-xs text-gray-500">Augmented Real-Action Dashboard</p>
        </div>
        <nav className="ml-auto flex gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-sm transition ${
                activeTab === t.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto p-6">
        {activeTab === 'live' && <LiveFeed />}
        {activeTab === 'workflows' && (
          <WorkflowBuilder
            tags={tags}
            workflows={workflows}
            onAdd={handleAddWorkflow}
            onDelete={handleDeleteWorkflow}
            onToggle={handleToggleWorkflow}
          />
        )}
        {activeTab === 'analytics' && <Analytics data={heatmap} tags={tags} />}
        {activeTab === 'devices' && (
          <DeviceList devices={devices} onPair={handlePairDevice} />
        )}
      </main>
    </div>
  );
}
