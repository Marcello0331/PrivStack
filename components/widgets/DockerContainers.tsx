'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileText, Loader2, Play, RefreshCw, RotateCw, Square, X } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface DockerContainer {
  id: string;
  fullId: string;
  name: string;
  image: string;
  state: string;
  status: string;
  createdAt: string | null;
  uptime: string;
  ports: string[];
}

const STATE_STYLES: Record<string, string> = {
  running: 'bg-green-500/20 text-green-400',
  exited: 'bg-red-500/20 text-red-400',
  paused: 'bg-yellow-500/20 text-yellow-300',
  restarting: 'bg-blue-500/20 text-blue-300',
};

function errorText(error: string) {
  const messages: Record<string, string> = {
    docker_unavailable: 'Docker daemon is unavailable.',
    permission_denied: 'PrivStack cannot access the Docker socket.',
    socket_missing: 'Docker socket is not mounted.',
  };

  return messages[error] || 'Docker unavailable.';
}

export default function DockerContainersWidget({ config }: { config?: Record<string, any> }) {
  const { data: session } = useSession();
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [logsContainer, setLogsContainer] = useState<DockerContainer | null>(null);
  const [logs, setLogs] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [actionId, setActionId] = useState('');

  const isAdmin = (session?.user as any)?.role === 'admin';

  const fetchContainers = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    setError('');

    try {
      const response = await fetch('/api/widgets/docker');
      const data = await response.json();

      if (!response.ok || data.error) {
        setContainers([]);
        setError(data.error || 'docker_unavailable');
        return;
      }

      setContainers(data.containers || []);
    } catch {
      setContainers([]);
      setError('docker_unavailable');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchContainers();
    const interval = setInterval(fetchContainers, 30000);
    return () => clearInterval(interval);
  }, []);

  const summary = useMemo(() => ({
    running: containers.filter((container) => container.state === 'running').length,
    stopped: containers.filter((container) => container.state === 'exited').length,
    other: containers.filter((container) => !['running', 'exited'].includes(container.state)).length,
  }), [containers]);

  const openLogs = async (container: DockerContainer) => {
    setLogsContainer(container);
    setLogs('');
    setLoadingLogs(true);

    try {
      const response = await fetch(`/api/widgets/docker/${encodeURIComponent(container.fullId)}/logs?tail=200`);
      const data = await response.json();
      setLogs(response.ok ? data.logs || 'No logs found.' : data.message || 'Unable to load logs.');
    } catch {
      setLogs('Unable to load logs.');
    } finally {
      setLoadingLogs(false);
    }
  };

  const runAction = async (container: DockerContainer, action: 'start' | 'stop' | 'restart') => {
    if ((action === 'stop' || action === 'restart') && !confirm(`${action} ${container.name}?`)) {
      return;
    }

    setActionId(`${container.fullId}:${action}`);
    setError('');

    try {
      const response = await fetch(`/api/widgets/docker/${encodeURIComponent(container.fullId)}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'docker_unavailable');
        return;
      }

      await fetchContainers();
    } catch {
      setError('docker_unavailable');
    } finally {
      setActionId('');
    }
  };

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>;

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="grid grid-cols-3 gap-2 flex-1">
          <div className="glass-sm p-2 rounded-lg text-center">
            <div className="text-lg font-bold text-green-400">{summary.running}</div>
            <div className="text-[11px] text-gray-400">Running</div>
          </div>
          <div className="glass-sm p-2 rounded-lg text-center">
            <div className="text-lg font-bold text-red-400">{summary.stopped}</div>
            <div className="text-[11px] text-gray-400">Stopped</div>
          </div>
          <div className="glass-sm p-2 rounded-lg text-center">
            <div className="text-lg font-bold text-gray-300">{summary.other}</div>
            <div className="text-[11px] text-gray-400">Other</div>
          </div>
        </div>
        <button
          onClick={() => fetchContainers(true)}
          className="p-2 rounded-lg hover:bg-white/10 text-gray-300 disabled:opacity-50"
          disabled={refreshing}
          title="Refresh containers"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && <div className="text-xs text-red-400">{errorText(error)}</div>}

      <div className="max-h-72 overflow-y-auto space-y-2">
        {containers.length === 0 && !error && (
          <div className="glass-sm p-3 rounded-lg text-xs text-gray-400">No containers found.</div>
        )}

        {containers.map((container) => {
          const isRunning = container.state === 'running';

          return (
            <div key={container.fullId} className="glass-sm p-2 rounded-lg text-xs space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">{container.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] ${STATE_STYLES[container.state] || 'bg-gray-500/20 text-gray-300'}`}>
                      {container.state}
                    </span>
                  </div>
                  <p className="text-gray-400 truncate">{container.image}</p>
                </div>
                <button
                  onClick={() => openLogs(container)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-gray-300"
                  title="View logs"
                >
                  <FileText size={14} />
                </button>
              </div>

              <div className="text-gray-400">
                <p className="truncate">{container.uptime}</p>
                {container.ports.length > 0 && <p className="truncate">{container.ports.join(', ')}</p>}
              </div>

              {isAdmin && (
                <div className="flex gap-1.5">
                  <ActionButton
                    title="Start"
                    loading={actionId === `${container.fullId}:start`}
                    disabled={isRunning}
                    onClick={() => runAction(container, 'start')}
                  >
                    <Play size={13} />
                  </ActionButton>
                  <ActionButton
                    title="Stop"
                    loading={actionId === `${container.fullId}:stop`}
                    disabled={!isRunning}
                    onClick={() => runAction(container, 'stop')}
                  >
                    <Square size={13} />
                  </ActionButton>
                  <ActionButton
                    title="Restart"
                    loading={actionId === `${container.fullId}:restart`}
                    disabled={!isRunning}
                    onClick={() => runAction(container, 'restart')}
                  >
                    <RotateCw size={13} />
                  </ActionButton>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {logsContainer && (
        <div className="fixed inset-0 z-[100] bg-black/60 p-4 flex items-center justify-center">
          <div className="glass w-full max-w-4xl max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold truncate">{logsContainer.name}</p>
                <p className="text-xs text-gray-400">Last 200 log lines</p>
              </div>
              <button
                onClick={() => setLogsContainer(null)}
                className="p-2 rounded-lg hover:bg-white/10"
                title="Close logs"
              >
                <X size={18} />
              </button>
            </div>
            <pre className="p-4 overflow-auto text-xs text-gray-200 whitespace-pre-wrap font-mono min-h-80">
              {loadingLogs ? 'Loading logs...' : logs}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionButton({
  children,
  disabled,
  loading,
  onClick,
  title,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  loading: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="p-1.5 rounded-lg hover:bg-white/10 text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
      title={title}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : children}
    </button>
  );
}
