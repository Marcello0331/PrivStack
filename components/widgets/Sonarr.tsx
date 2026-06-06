'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Search, Trash2, Wand2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface QueueItem {
  id: number;
  title: string;
  status: string;
  protocol: string;
  timeLeft: string;
  downloadClient: string;
}

interface RecentSeries {
  id: number;
  title: string;
  year?: number;
  monitored: boolean;
  seasonCount: number;
  added: string | null;
}

interface SonarrData {
  error?: string;
  message?: string;
  seriesCount?: number;
  monitoredCount?: number;
  wantedCount?: number;
  queueSize?: number;
  queue?: QueueItem[];
  recent?: RecentSeries[];
}

function errorText(data: SonarrData | null) {
  const messages: Record<string, string> = {
    auth_failed: 'Sonarr API key was rejected.',
    not_configured: 'Configure Sonarr in settings or this widget.',
    unreachable: 'Sonarr is unreachable from the server.',
  };

  return messages[data?.error || ''] || data?.message || 'Unable to load Sonarr.';
}

export default function SonarrWidget({ config }: { config?: Record<string, any> }) {
  const { data: session } = useSession();
  const [data, setData] = useState<SonarrData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'queue' | 'recent'>('queue');
  const [actionId, setActionId] = useState('');

  const isAdmin = (session?.user as any)?.role === 'admin';

  const fetchData = async (manual = false) => {
    if (manual) setRefreshing(true);

    try {
      const params = new URLSearchParams();
      if (config?.connectionId) params.set('connectionId', String(config.connectionId));
      const response = await fetch(`/api/widgets/sonarr?${params.toString()}`);
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

  const queue = data?.queue || [];
  const recent = data?.recent || [];
  const visibleQueue = useMemo(() => (
    queue.filter((item) => `${item.title} ${item.status} ${item.downloadClient}`.toLowerCase().includes(query.toLowerCase()))
  ), [query, queue]);
  const visibleRecent = useMemo(() => (
    recent.filter((item) => `${item.title} ${item.year || ''}`.toLowerCase().includes(query.toLowerCase()))
  ), [query, recent]);

  const runAction = async (action: 'refresh' | 'search-missing' | 'remove-queue', queueId?: number) => {
    if (action === 'search-missing' && !confirm('Search for all missing Sonarr episodes?')) return;
    if (action === 'remove-queue' && !confirm('Remove this queue item from Sonarr?')) return;

    setActionId(`${action}:${queueId || 'all'}`);

    try {
      const response = await fetch('/api/widgets/sonarr/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          queueId,
          connectionId: config?.connectionId,
          removeFromClient: true,
          blocklist: false,
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
        <Stat label="Series" value={data?.seriesCount || 0} />
        <Stat label="Wanted" value={data?.wantedCount || 0} tone="text-red-400" />
        <Stat label="Queue" value={data?.queueSize || 0} tone="text-accent-cyan" />
      </div>

      <div className="grid grid-cols-[1fr_110px_auto] gap-2">
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
          onChange={(event) => setView(event.target.value as 'queue' | 'recent')}
          className="bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs outline-none focus:border-accent-blue"
        >
          <option value="queue">Queue</option>
          <option value="recent">Recent</option>
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
          <ActionButton title="Refresh series" loading={actionId === 'refresh:all'} onClick={() => runAction('refresh')}>
            <RefreshCw size={13} />
            Refresh
          </ActionButton>
          <ActionButton title="Search missing" loading={actionId === 'search-missing:all'} onClick={() => runAction('search-missing')}>
            <Wand2 size={13} />
            Missing
          </ActionButton>
        </div>
      )}

      <div className="max-h-72 overflow-y-auto space-y-2">
        {view === 'queue' && visibleQueue.map((item) => (
          <div key={item.id} className="glass-sm p-2 rounded-lg text-xs space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{item.title}</p>
                <p className="text-gray-400 truncate">{[item.status, item.protocol, item.downloadClient, item.timeLeft].filter(Boolean).join(' - ')}</p>
              </div>
              {isAdmin && (
                <IconButton title="Remove queue item" loading={actionId === `remove-queue:${item.id}`} onClick={() => runAction('remove-queue', item.id)}>
                  <Trash2 size={13} />
                </IconButton>
              )}
            </div>
          </div>
        ))}

        {view === 'recent' && visibleRecent.map((item) => (
          <div key={item.id} className="glass-sm p-2 rounded-lg text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{item.title} {item.year ? `(${item.year})` : ''}</p>
                <p className="text-gray-400">{item.monitored ? 'Monitored' : 'Unmonitored'} - {item.seasonCount} seasons</p>
              </div>
            </div>
          </div>
        ))}

        {((view === 'queue' && !visibleQueue.length) || (view === 'recent' && !visibleRecent.length)) && (
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
