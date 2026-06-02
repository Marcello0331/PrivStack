'use client';

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, RefreshCw, Search } from 'lucide-react';

type MonitorStatus = 'up' | 'down' | 'maintenance' | 'unknown';

interface KumaHeartbeat {
  status: number;
  time?: string;
  ping?: number | null;
  msg?: string;
}

interface KumaMonitor {
  id: number | string;
  name: string;
  type?: string;
  groupName?: string;
  status: MonitorStatus;
  ping: number | null;
  uptime: number | null;
  heartbeats: KumaHeartbeat[];
  lastChecked: string | null;
}

interface KumaWidgetData {
  error?: string;
  title?: string;
  slug?: string;
  statusPageUrl?: string;
  monitors?: KumaMonitor[];
  summary?: Record<MonitorStatus | 'total', number>;
  updatedAt?: string;
}

interface KumaWidgetConfig {
  url?: string;
  slug?: string;
  selectedMonitorIds?: string[];
  showSummary?: boolean;
  showMonitorList?: boolean;
  showHeartbeat?: boolean;
  showUptime?: boolean;
}

const STATUS_STYLES: Record<MonitorStatus, string> = {
  up: 'bg-green-500/20 text-green-400',
  down: 'bg-red-500/20 text-red-400',
  maintenance: 'bg-blue-500/20 text-blue-300',
  unknown: 'bg-gray-500/20 text-gray-300',
};

const HEARTBEAT_STYLES: Record<number, string> = {
  0: 'bg-red-400',
  1: 'bg-green-400',
  2: 'bg-gray-500',
  3: 'bg-blue-300',
};

function formatRelativeTime(value: string | null) {
  if (!value) return 'Never';

  const diff = Date.now() - new Date(value).getTime();
  if (Number.isNaN(diff)) return 'Unknown';

  const minutes = Math.max(0, Math.round(diff / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.round(hours / 24)}d ago`;
}

function errorText(error: string) {
  const messages: Record<string, string> = {
    not_configured: 'Configure an Uptime Kuma URL in settings or this widget.',
    invalid_url: 'The configured Uptime Kuma URL is invalid.',
    bad_slug: 'The status page slug was not found or is not published.',
    unreachable: 'Uptime Kuma is unreachable from the server.',
  };

  return messages[error] || 'Unable to load Uptime Kuma data.';
}

export default function UptimeKumaWidget({ config }: { config?: KumaWidgetConfig }) {
  const [data, setData] = useState<KumaWidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<MonitorStatus | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const showSummary = config?.showSummary !== false;
  const showMonitorList = config?.showMonitorList !== false;
  const showHeartbeat = config?.showHeartbeat !== false;
  const showUptime = config?.showUptime !== false;
  const selectedIds = config?.selectedMonitorIds;

  const fetchData = async (isManual = false) => {
    if (selectedIds && selectedIds.length === 0) {
      setData({ monitors: [], summary: { up: 0, down: 0, maintenance: 0, unknown: 0, total: 0 } });
      setLoading(false);
      return;
    }

    if (isManual) setRefreshing(true);

    const params = new URLSearchParams();
    if (config?.url) params.set('url', config.url);
    if (config?.slug) params.set('slug', config.slug);
    if (selectedIds?.length) params.set('monitors', selectedIds.join(','));

    try {
      const response = await fetch(`/api/widgets/uptime-kuma?${params.toString()}`);
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
  }, [config?.url, config?.slug, selectedIds?.join(',')]);

  const monitors = data?.monitors || [];
  const visibleMonitors = useMemo(() => (
    monitors.filter((monitor) => {
      const matchesSearch = monitor.name.toLowerCase().includes(search.toLowerCase())
        || (monitor.groupName || '').toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || monitor.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
  ), [monitors, search, statusFilter]);

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>;
  if (data?.error) return <div className="text-red-400 text-sm">{errorText(data.error)}</div>;

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium truncate">{data?.title || 'Uptime Kuma'}</p>
          <p className="text-xs text-gray-500">
            {data?.updatedAt ? `Updated ${formatRelativeTime(data.updatedAt)}` : 'Status page data'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {data?.statusPageUrl && (
            <a
              href={data.statusPageUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg hover:bg-white/10 text-gray-300"
              title="Open status page"
            >
              <ExternalLink size={15} />
            </a>
          )}
          <button
            onClick={() => fetchData(true)}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-300 disabled:opacity-50"
            disabled={refreshing}
            title="Refresh"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {showSummary && (
        <div className="grid grid-cols-4 gap-2">
          {[
            ['up', 'Up', 'text-green-400'],
            ['down', 'Down', 'text-red-400'],
            ['maintenance', 'Maint', 'text-blue-300'],
            ['unknown', 'Unknown', 'text-gray-300'],
          ].map(([key, label, color]) => (
            <div key={key} className="glass-sm p-2 rounded-lg text-center">
              <div className={`text-lg font-bold ${color}`}>{data?.summary?.[key as MonitorStatus] || 0}</div>
              <div className="text-[11px] text-gray-400 truncate">{label}</div>
            </div>
          ))}
        </div>
      )}

      {showMonitorList && (
        <>
          <div className="grid grid-cols-[1fr_130px] gap-2">
            <label className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search"
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-2 py-2 text-xs outline-none focus:border-accent-blue"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as MonitorStatus | 'all')}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs outline-none focus:border-accent-blue"
            >
              <option value="all">All</option>
              <option value="up">Up</option>
              <option value="down">Down</option>
              <option value="maintenance">Maintenance</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>

          {!monitors.length && (
            <div className="glass-sm p-3 rounded-lg text-xs text-gray-400">
              {selectedIds && selectedIds.length === 0 ? 'No monitors selected.' : 'This status page has no visible monitors.'}
            </div>
          )}

          <div className="space-y-2">
            {visibleMonitors.map((monitor) => {
              const expanded = expandedId === String(monitor.id);
              return (
                <button
                  key={monitor.id}
                  onClick={() => setExpandedId(expanded ? null : String(monitor.id))}
                  className="w-full glass-sm p-2 rounded-lg text-left hover:bg-white/5 transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{monitor.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {[monitor.groupName, monitor.type, formatRelativeTime(monitor.lastChecked)].filter(Boolean).join(' - ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {showUptime && monitor.uptime !== null && (
                        <span className="text-xs text-gray-300">{monitor.uptime.toFixed(1)}%</span>
                      )}
                      <span className={`px-2 py-1 rounded-full text-[11px] uppercase ${STATUS_STYLES[monitor.status]}`}>
                        {monitor.status}
                      </span>
                    </div>
                  </div>

                  {expanded && (
                    <div className="mt-3 space-y-2">
                      {showHeartbeat && (
                        <div className="flex gap-0.5 h-6 items-end">
                          {monitor.heartbeats.slice(-36).map((heartbeat, index) => (
                            <span
                              key={`${heartbeat.time || index}-${index}`}
                              className={`flex-1 rounded-sm ${HEARTBEAT_STYLES[heartbeat.status] || 'bg-gray-500'}`}
                              style={{ height: heartbeat.status === 0 ? '100%' : '65%' }}
                              title={`${heartbeat.time || 'Unknown'} ${heartbeat.msg || ''}`}
                            />
                          ))}
                        </div>
                      )}
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>{monitor.ping !== null ? `${monitor.ping} ms` : 'No ping'}</span>
                        <span>{monitor.heartbeats.length} checks</span>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
