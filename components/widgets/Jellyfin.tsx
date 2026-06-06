'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Search, Square, Wand2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface JellyfinSession {
  id: string;
  userName: string;
  client: string;
  deviceName: string;
  playState: string;
  itemTitle: string;
  itemSubtitle: string;
  itemType: string;
  progress: number;
}

interface JellyfinLibrary {
  id: string;
  name: string;
  type: string;
}

interface JellyfinRecent {
  id: string;
  title: string;
  subtitle: string;
  type: string;
  dateCreated: string | null;
}

interface JellyfinData {
  error?: string;
  message?: string;
  activeSessions?: number;
  sessionCount?: number;
  recentlyAdded?: number;
  movieCount?: number;
  showCount?: number;
  episodeCount?: number;
  sessions?: JellyfinSession[];
  libraries?: JellyfinLibrary[];
  recent?: JellyfinRecent[];
}

function errorText(data: JellyfinData | null) {
  const messages: Record<string, string> = {
    auth_failed: 'Jellyfin API key was rejected.',
    not_configured: 'Configure Jellyfin in settings or this widget.',
    unreachable: 'Jellyfin is unreachable from the server.',
  };

  return messages[data?.error || ''] || data?.message || 'Unable to load Jellyfin.';
}

export default function JellyfinWidget({ config }: { config?: Record<string, any> }) {
  const { data: session } = useSession();
  const [data, setData] = useState<JellyfinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'sessions' | 'libraries' | 'recent'>('sessions');
  const [actionId, setActionId] = useState('');

  const isAdmin = (session?.user as any)?.role === 'admin';

  const fetchData = async (manual = false) => {
    if (manual) setRefreshing(true);

    try {
      const params = new URLSearchParams();
      if (config?.connectionId) params.set('connectionId', String(config.connectionId));
      const response = await fetch(`/api/widgets/jellyfin?${params.toString()}`);
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

  const sessions = data?.sessions || [];
  const libraries = data?.libraries || [];
  const recent = data?.recent || [];
  const visibleSessions = useMemo(() => (
    sessions.filter((item) => `${item.itemTitle} ${item.userName} ${item.client} ${item.deviceName}`.toLowerCase().includes(query.toLowerCase()))
  ), [query, sessions]);
  const visibleLibraries = useMemo(() => (
    libraries.filter((item) => `${item.name} ${item.type}`.toLowerCase().includes(query.toLowerCase()))
  ), [libraries, query]);
  const visibleRecent = useMemo(() => (
    recent.filter((item) => `${item.title} ${item.subtitle} ${item.type}`.toLowerCase().includes(query.toLowerCase()))
  ), [query, recent]);

  const runAction = async (action: 'refresh-library' | 'stop-session', payload: Record<string, string> = {}) => {
    if (action === 'stop-session' && !confirm('Stop this Jellyfin playback session?')) return;
    if (action === 'refresh-library' && !confirm('Refresh Jellyfin libraries now?')) return;

    setActionId(`${action}:${payload.sessionId || 'all'}`);

    try {
      const response = await fetch('/api/widgets/jellyfin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload, connectionId: config?.connectionId }),
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
        <Stat label="Active" value={data?.activeSessions || 0} />
        <Stat label="Movies" value={data?.movieCount || 0} tone="text-accent-cyan" />
        <Stat label="Shows" value={data?.showCount || 0} tone="text-green-400" />
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
          onChange={(event) => setView(event.target.value as 'sessions' | 'libraries' | 'recent')}
          className="bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs outline-none focus:border-accent-blue"
        >
          <option value="sessions">Sessions</option>
          <option value="libraries">Libraries</option>
          <option value="recent">Recent</option>
        </select>
        <button onClick={() => fetchData(true)} disabled={refreshing} className="p-2 rounded-lg hover:bg-white/10 text-gray-300 disabled:opacity-50" title="Refresh">
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {isAdmin && (
        <button
          onClick={() => runAction('refresh-library')}
          disabled={actionId === 'refresh-library:all'}
          className="btn btn-secondary py-1.5 px-2 text-xs flex items-center gap-1 disabled:opacity-50"
          title="Refresh library"
        >
          {actionId === 'refresh-library:all' ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
          Refresh libraries
        </button>
      )}

      <div className="max-h-72 overflow-y-auto space-y-2">
        {view === 'sessions' && visibleSessions.map((item) => (
          <div key={item.id} className="glass-sm p-2 rounded-lg text-xs space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{item.itemTitle || item.userName}</p>
                <p className="text-gray-400 truncate">{[item.itemSubtitle, item.userName, item.client, item.playState].filter(Boolean).join(' - ')}</p>
              </div>
              {isAdmin && item.itemTitle && (
                <IconButton title="Stop session" loading={actionId === `stop-session:${item.id}`} onClick={() => runAction('stop-session', { sessionId: item.id })}>
                  <Square size={13} />
                </IconButton>
              )}
            </div>
            {item.itemTitle && (
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-accent-blue" style={{ width: `${Math.min(Math.max(item.progress, 0), 100)}%` }} />
              </div>
            )}
          </div>
        ))}

        {view === 'libraries' && visibleLibraries.map((item) => (
          <div key={item.id} className="glass-sm p-2 rounded-lg text-xs">
            <p className="font-medium truncate">{item.name}</p>
            <p className="text-gray-400 truncate">{item.type || 'library'}</p>
          </div>
        ))}

        {view === 'recent' && visibleRecent.map((item) => (
          <div key={item.id} className="glass-sm p-2 rounded-lg text-xs">
            <p className="font-medium truncate">{item.title}</p>
            <p className="text-gray-400 truncate">{[item.subtitle, item.type].filter(Boolean).join(' - ')}</p>
          </div>
        ))}

        {((view === 'sessions' && !visibleSessions.length) || (view === 'libraries' && !visibleLibraries.length) || (view === 'recent' && !visibleRecent.length)) && (
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

function IconButton({ children, loading, onClick, title }: { children: React.ReactNode; loading: boolean; onClick: () => void; title: string }) {
  return (
    <button onClick={onClick} disabled={loading} title={title} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-300 disabled:opacity-50">
      {loading ? <Loader2 size={13} className="animate-spin" /> : children}
    </button>
  );
}
