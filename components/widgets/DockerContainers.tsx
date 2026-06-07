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

interface DockerErrorState {
  error: string;
  message?: string;
  hint?: string;
  dockerAccess?: string;
  dockerTarget?: string;
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
  const [error, setError] = useState<DockerErrorState | null>(null);
  const [logsContainer, setLogsContainer] = useState<DockerContainer | null>(null);
  const [logs, setLogs] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [actionId, setActionId] = useState('');

  const isAdmin = (session?.user as any)?.role === 'admin';

  const fetchContainers = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    setError(null);

    try {
      const response = await fetch('/api/widgets/docker');
      const data = await response.json();

      if (!response.ok || data.error) {
        setContainers([]);
        setError({
          error: data.error || 'docker_unavailable',
          message: data.message,
          hint: data.hint,
          dockerAccess: data.dockerAccess,
          dockerTarget: data.dockerTarget,
        });
        return;
      }

      setContainers(data.containers || []);
    } catch {
      setContainers([]);
      setError({ error: 'docker_unavailable' });
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
    setError(null);

    try {
      const response = await fetch(`/api/widgets/docker/${encodeURIComponent(container.fullId)}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError({
          error: data.error || 'docker_unavailable',
          message: data.message,
          hint: data.hint,
          dockerAccess: data.dockerAccess,
          dockerTarget: data.dockerTarget,
        });
        return;
      }

      await fetchContainers();
    } catch {
      setError({ error: 'docker_unavailable' });
    } finally {
      setActionId('');
    }
  };

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>;

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5 flex-1 text-[11px]">
          <SummaryPill label="Running" value={summary.running} tone="text-green-300" />
          <SummaryPill label="Stopped" value={summary.stopped} tone="text-red-300" />
          <SummaryPill label="Other" value={summary.other} tone="text-gray-300" />
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

      {error && (
        <div className="rounded-lg border border-red-500/25 bg-red-500/10 p-2 text-xs text-red-100 space-y-1">
          <p className="font-medium">{error.message || errorText(error.error)}</p>
          {error.hint && <p className="text-red-100/80">{error.hint}</p>}
          {error.dockerTarget && (
            <p className="text-red-100/60">
              {error.dockerAccess === 'host' ? 'Docker host' : 'Socket'}: {error.dockerTarget}
            </p>
          )}
        </div>
      )}

      <div className="max-h-72 overflow-y-auto rounded-lg border border-white/10">
        {containers.length === 0 && !error && (
          <div className="glass-sm p-3 rounded-lg text-xs text-gray-400">No containers found.</div>
        )}

        {containers.length > 0 && (
          <div className="grid grid-cols-[1.5fr_88px_72px_92px] gap-2 px-2 py-1.5 text-[11px] uppercase tracking-wide text-gray-500 bg-white/5 sticky top-0 z-10">
            <span>Name</span>
            <span>State</span>
            <span>Ports</span>
            <span className="text-right">Actions</span>
          </div>
        )}

        {containers.map((container) => {
          const isRunning = container.state === 'running';

          return (
            <div key={container.fullId} className="grid grid-cols-[1.5fr_88px_72px_92px] gap-2 px-2 py-2 text-xs border-t border-white/10 items-center">
              <div className="min-w-0">
                <p className="font-medium truncate">{container.name}</p>
                <p className="text-gray-500 truncate">{container.image}</p>
              </div>
              <div className="min-w-0">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${STATE_STYLES[container.state] || 'bg-gray-500/20 text-gray-300'}`}>
                  {container.state}
                </span>
                <p className="text-gray-500 truncate mt-1">{container.uptime}</p>
              </div>
              <div className="text-gray-400 truncate" title={container.ports.join(', ')}>
                {container.ports.length || '--'}
              </div>

              <div className="flex justify-end gap-1">
                <button
                  onClick={() => openLogs(container)}
                  className="p-1.5 rounded-md hover:bg-white/10 text-gray-300"
                  title="View logs"
                >
                  <FileText size={13} />
                </button>
                {isAdmin && (
                  <>
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
                  </>
                )}
              </div>
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

function SummaryPill({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="glass-sm px-2 py-1 rounded-md">
      <span className={tone}>{value}</span>
      <span className="ml-1 text-gray-400">{label}</span>
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
