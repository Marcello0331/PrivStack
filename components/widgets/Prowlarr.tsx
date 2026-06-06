'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Search, TestTube2, Waypoints } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface ProwlarrIndexer {
  id: number;
  name: string;
  implementation: string;
  protocol: string;
  privacy: string;
  enable: boolean;
  priority: number;
}

interface ProwlarrApplication {
  id: number;
  name: string;
  implementation: string;
  syncLevel: string;
  enable: boolean;
}

interface ProwlarrHealth {
  source: string;
  type: string;
  message: string;
}

interface ProwlarrData {
  error?: string;
  message?: string;
  version?: string;
  indexerCount?: number;
  enabledIndexerCount?: number;
  disabledIndexerCount?: number;
  appCount?: number;
  healthCount?: number;
  indexers?: ProwlarrIndexer[];
  applications?: ProwlarrApplication[];
  health?: ProwlarrHealth[];
}

function errorText(data: ProwlarrData | null) {
  const messages: Record<string, string> = {
    auth_failed: 'Prowlarr API key was rejected.',
    not_configured: 'Configure Prowlarr in settings or this widget.',
    unreachable: 'Prowlarr is unreachable from the server.',
  };

  return messages[data?.error || ''] || data?.message || 'Unable to load Prowlarr.';
}

export default function ProwlarrWidget({ config }: { config?: Record<string, any> }) {
  const { data: session } = useSession();
  const [data, setData] = useState<ProwlarrData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'indexers' | 'apps' | 'health'>('indexers');
  const [actionId, setActionId] = useState('');

  const isAdmin = (session?.user as any)?.role === 'admin';

  const fetchData = async (manual = false) => {
    if (manual) setRefreshing(true);

    try {
      const params = new URLSearchParams();
      if (config?.connectionId) params.set('connectionId', String(config.connectionId));
      const response = await fetch(`/api/widgets/prowlarr?${params.toString()}`);
      const result = await response.json();
      setData(result);
    } catch {
      setData({ error: 'unreachable' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.connectionId]);

  const indexers = data?.indexers || [];
  const applications = data?.applications || [];
  const health = data?.health || [];

  const visibleIndexers = useMemo(() => (
    indexers.filter((item) => `${item.name} ${item.implementation} ${item.protocol} ${item.privacy}`.toLowerCase().includes(query.toLowerCase()))
  ), [indexers, query]);
  const visibleApps = useMemo(() => (
    applications.filter((item) => `${item.name} ${item.implementation} ${item.syncLevel}`.toLowerCase().includes(query.toLowerCase()))
  ), [applications, query]);
  const visibleHealth = useMemo(() => (
    health.filter((item) => `${item.source} ${item.type} ${item.message}`.toLowerCase().includes(query.toLowerCase()))
  ), [health, query]);

  const runAction = async (action: 'sync-apps' | 'test-indexer' | 'test-all-indexers', indexerId?: number) => {
    if (action === 'test-all-indexers' && !confirm('Test all Prowlarr indexers?')) return;
    if (action === 'sync-apps' && !confirm('Sync Prowlarr applications now?')) return;

    setActionId(`${action}:${indexerId || 'all'}`);

    try {
      const response = await fetch('/api/widgets/prowlarr/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          indexerId,
          connectionId: config?.connectionId,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        setData((current) => ({ ...(current || {}), error: result.error || 'unreachable', message: result.message }));
        return;
      }

      await fetchData();
    } catch {
      setData((current) => ({ ...(current || {}), error: 'unreachable' }));
    } finally {
      setActionId('');
    }
  };

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>;
  if (data?.error) return <div className="text-red-400 text-sm">{errorText(data)}</div>;

  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Indexers" value={data?.enabledIndexerCount || 0} />
        <Stat label="Apps" value={data?.appCount || 0} tone="text-accent-cyan" />
        <Stat label="Health" value={data?.healthCount || 0} tone={(data?.healthCount || 0) > 0 ? 'text-red-400' : 'text-green-400'} />
      </div>

      <div className="grid grid-cols-[1fr_108px_auto] gap-2">
        <label className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-2 py-2 text-xs outline-none focus:border-accent-blue"
          />
        </label>
        <select
          value={view}
          onChange={(event) => setView(event.target.value as 'indexers' | 'apps' | 'health')}
          className="bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs outline-none focus:border-accent-blue"
        >
          <option value="indexers">Indexers</option>
          <option value="apps">Apps</option>
          <option value="health">Health</option>
        </select>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="p-2 rounded-lg hover:bg-white/10 text-gray-300 disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {isAdmin && (
        <div className="flex gap-2">
          <ActionButton title="Sync apps" loading={actionId === 'sync-apps:all'} onClick={() => runAction('sync-apps')}>
            <Waypoints size={13} />
            Sync apps
          </ActionButton>
          <ActionButton title="Test all indexers" loading={actionId === 'test-all-indexers:all'} onClick={() => runAction('test-all-indexers')}>
            <TestTube2 size={13} />
            Test all
          </ActionButton>
        </div>
      )}

      <div className="max-h-72 overflow-y-auto space-y-2">
        {view === 'indexers' && visibleIndexers.map((indexer) => (
          <div key={indexer.id} className="glass-sm p-2 rounded-lg text-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{indexer.name}</p>
                <p className="text-gray-400 truncate">{[indexer.implementation, indexer.protocol, indexer.privacy].filter(Boolean).join(' - ')}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className={`px-2 py-0.5 rounded-full text-[11px] ${indexer.enable ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {indexer.enable ? 'on' : 'off'}
                </span>
                {isAdmin && (
                  <IconButton
                    title="Test indexer"
                    loading={actionId === `test-indexer:${indexer.id}`}
                    onClick={() => runAction('test-indexer', indexer.id)}
                  >
                    <TestTube2 size={13} />
                  </IconButton>
                )}
              </div>
            </div>
          </div>
        ))}

        {view === 'apps' && visibleApps.map((app) => (
          <div key={app.id} className="glass-sm p-2 rounded-lg text-xs">
            <p className="font-medium truncate">{app.name}</p>
            <p className="text-gray-400 truncate">{[app.implementation, app.syncLevel, app.enable ? 'enabled' : 'disabled'].filter(Boolean).join(' - ')}</p>
          </div>
        ))}

        {view === 'health' && visibleHealth.map((item, index) => (
          <div key={`${item.source}-${index}`} className="glass-sm p-2 rounded-lg text-xs">
            <p className="font-medium truncate">{item.source}</p>
            <p className="text-red-300">{item.message}</p>
          </div>
        ))}

        {((view === 'indexers' && !visibleIndexers.length) || (view === 'apps' && !visibleApps.length) || (view === 'health' && !visibleHealth.length)) && (
          <div className="glass-sm p-3 rounded-lg text-xs text-gray-400">No items found.</div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone = 'text-accent-blue' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="glass-sm p-2 rounded-lg text-center">
      <div className={`text-lg font-bold ${tone}`}>{value}</div>
      <div className="text-[11px] text-gray-400">{label}</div>
    </div>
  );
}

function ActionButton({ children, loading, onClick, title }: { children: React.ReactNode; loading: boolean; onClick: () => void; title: string }) {
  return (
    <button onClick={onClick} disabled={loading} title={title} className="btn btn-secondary py-1.5 px-2 text-xs flex items-center gap-1 disabled:opacity-50">
      {loading ? <Loader2 size={13} className="animate-spin" /> : children}
    </button>
  );
}

function IconButton({ children, loading, onClick, title }: { children: React.ReactNode; loading: boolean; onClick: () => void; title: string }) {
  return (
    <button onClick={onClick} disabled={loading} title={title} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-300 disabled:opacity-50">
      {loading ? <Loader2 size={13} className="animate-spin" /> : children}
    </button>
  );
}
