'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Pause, Play, RefreshCw, RotateCw, Search, Trash2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface QbitTorrent {
  hash: string;
  name: string;
  size: number;
  progress: number;
  state: string;
  category: string;
  tags: string;
  downSpeed: number;
  upSpeed: number;
  eta: number;
  ratio: number;
}

interface QbitData {
  error?: string;
  message?: string;
  activeTorrents?: number;
  pausedTorrents?: number;
  totalTorrents?: number;
  downSpeedLabel?: string;
  upSpeedLabel?: string;
  torrents?: QbitTorrent[];
}

const ACTIVE_STATES = new Set(['downloading', 'uploading', 'stalledDL', 'stalledUP', 'metaDL', 'forcedDL', 'forcedUP']);

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function formatEta(seconds: number) {
  if (!seconds || seconds < 0 || seconds >= 8640000) return 'Unknown';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

function errorText(data: QbitData | null) {
  const messages: Record<string, string> = {
    auth_failed: 'qBittorrent authentication failed.',
    not_configured: 'Configure qBittorrent in settings or this widget.',
    unreachable: 'qBittorrent is unreachable from the server.',
  };

  return messages[data?.error || ''] || data?.message || 'Unable to load qBittorrent.';
}

export default function QbittorrentWidget({ config }: { config?: Record<string, any> }) {
  const { data: session } = useSession();
  const [data, setData] = useState<QbitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [actionId, setActionId] = useState('');

  const isAdmin = (session?.user as any)?.role === 'admin';

  const fetchData = async (manual = false) => {
    if (manual) setRefreshing(true);

    try {
      const params = new URLSearchParams();
      if (config?.connectionId) params.set('connectionId', String(config.connectionId));
      const response = await fetch(`/api/widgets/qbittorrent?${params.toString()}`);
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
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.connectionId]);

  const torrents = data?.torrents || [];
  const visibleTorrents = useMemo(() => (
    torrents.filter((torrent) => {
      const haystack = `${torrent.name} ${torrent.category} ${torrent.tags}`.toLowerCase();
      const matchesSearch = haystack.includes(query.toLowerCase());
      const matchesFilter = filter === 'all'
        || (filter === 'active' && ACTIVE_STATES.has(torrent.state))
        || (filter === 'paused' && torrent.state.toLowerCase().includes('paused'));
      return matchesSearch && matchesFilter;
    })
  ), [filter, query, torrents]);

  const runAction = async (action: 'pause' | 'resume' | 'recheck' | 'delete', hashes: string | 'all', deleteFiles = false) => {
    if (action === 'delete') {
      const target = hashes === 'all' ? 'all torrents' : 'this torrent';
      if (!confirm(`Delete ${target}${deleteFiles ? ' and files' : ''}?`)) return;
    }

    if (hashes === 'all' && (action === 'pause' || action === 'resume') && !confirm(`${action} all torrents?`)) {
      return;
    }

    setActionId(`${action}:${hashes}`);

    try {
      const response = await fetch('/api/widgets/qbittorrent/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          hashes,
          deleteFiles,
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
        <div className="glass-sm p-2 rounded-lg">
          <div className="text-[11px] text-gray-400">Download</div>
          <div className="font-semibold">{data?.downSpeedLabel || '0 B/s'}</div>
        </div>
        <div className="glass-sm p-2 rounded-lg">
          <div className="text-[11px] text-gray-400">Upload</div>
          <div className="font-semibold">{data?.upSpeedLabel || '0 B/s'}</div>
        </div>
        <div className="glass-sm p-2 rounded-lg">
          <div className="text-[11px] text-gray-400">Torrents</div>
          <div className="font-semibold text-accent-blue">{data?.activeTorrents || 0}/{data?.totalTorrents || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_96px_auto] gap-2">
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
          value={filter}
          onChange={(event) => setFilter(event.target.value as 'all' | 'active' | 'paused')}
          className="bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs outline-none focus:border-accent-blue"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
        </select>
        <button
          onClick={() => fetchData(true)}
          className="p-2 rounded-lg hover:bg-white/10 text-gray-300 disabled:opacity-50"
          disabled={refreshing}
          title="Refresh"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {isAdmin && (
        <div className="flex gap-2">
          <ActionButton
            title="Pause all"
            loading={actionId === 'pause:all'}
            onClick={() => runAction('pause', 'all')}
          >
            <Pause size={13} />
            Pause all
          </ActionButton>
          <ActionButton
            title="Resume all"
            loading={actionId === 'resume:all'}
            onClick={() => runAction('resume', 'all')}
          >
            <Play size={13} />
            Resume all
          </ActionButton>
        </div>
      )}

      <div className="max-h-72 overflow-y-auto space-y-2">
        {!visibleTorrents.length && (
          <div className="glass-sm p-3 rounded-lg text-xs text-gray-400">No torrents found.</div>
        )}

        {visibleTorrents.map((torrent) => {
          const paused = torrent.state.toLowerCase().includes('paused');

          return (
            <div key={torrent.hash} className="glass-sm p-2 rounded-lg text-xs space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{torrent.name}</p>
                  <p className="text-gray-400 truncate">
                    {[torrent.category, torrent.state, `${torrent.progress}%`, formatSize(torrent.size)].filter(Boolean).join(' - ')}
                  </p>
                </div>
                <span className="text-[11px] text-gray-400 shrink-0">ETA {formatEta(torrent.eta)}</span>
              </div>

              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-accent-blue" style={{ width: `${Math.min(Math.max(torrent.progress, 0), 100)}%` }} />
              </div>

              <div className="flex items-center justify-between gap-2 text-gray-400">
                <span>Down {formatSize(torrent.downSpeed)}/s</span>
                <span>Up {formatSize(torrent.upSpeed)}/s</span>
                <span>Ratio {torrent.ratio}</span>
              </div>

              {isAdmin && (
                <div className="flex gap-1.5">
                  <IconButton
                    title={paused ? 'Resume' : 'Pause'}
                    loading={actionId === `${paused ? 'resume' : 'pause'}:${torrent.hash}`}
                    onClick={() => runAction(paused ? 'resume' : 'pause', torrent.hash)}
                  >
                    {paused ? <Play size={13} /> : <Pause size={13} />}
                  </IconButton>
                  <IconButton
                    title="Recheck"
                    loading={actionId === `recheck:${torrent.hash}`}
                    onClick={() => runAction('recheck', torrent.hash)}
                  >
                    <RotateCw size={13} />
                  </IconButton>
                  <IconButton
                    title="Delete torrent"
                    loading={actionId === `delete:${torrent.hash}`}
                    onClick={() => runAction('delete', torrent.hash)}
                  >
                    <Trash2 size={13} />
                  </IconButton>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActionButton({
  children,
  loading,
  onClick,
  title,
}: {
  children: React.ReactNode;
  loading: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="btn btn-secondary py-1.5 px-2 text-xs flex items-center gap-1 disabled:opacity-50"
      title={title}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : children}
    </button>
  );
}

function IconButton({
  children,
  loading,
  onClick,
  title,
}: {
  children: React.ReactNode;
  loading: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="p-1.5 rounded-lg hover:bg-white/10 text-gray-300 disabled:opacity-50"
      title={title}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : children}
    </button>
  );
}
