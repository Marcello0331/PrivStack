'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { getWidgetRegistry } from '@/lib/widgetRegistry';

interface AddWidgetModalProps {
  onAdd: (widgetId: string, config?: Record<string, any>) => void;
  onClose: () => void;
  editingWidget?: {
    id: string;
    type: string;
    config?: Record<string, any>;
  };
}

interface KumaMonitorOption {
  id: number | string;
  name: string;
  groupName?: string;
  status?: string;
}

type KumaDisplayOption = 'showSummary' | 'showMonitorList' | 'showHeartbeat' | 'showUptime';

const KUMA_DISPLAY_OPTIONS: Array<{ key: KumaDisplayOption; label: string }> = [
  { key: 'showSummary', label: 'Summary' },
  { key: 'showMonitorList', label: 'Monitor list' },
  { key: 'showHeartbeat', label: 'Heartbeats' },
  { key: 'showUptime', label: 'Uptime' },
];

const DEFAULT_KUMA_CONFIG = {
  url: '',
  slug: 'default',
  selectedMonitorIds: undefined as string[] | undefined,
  showSummary: true,
  showMonitorList: true,
  showHeartbeat: true,
  showUptime: true,
};

export default function AddWidgetModal({ onAdd, onClose, editingWidget }: AddWidgetModalProps) {
  const widgets = getWidgetRegistry();
  const [selectedWidget, setSelectedWidget] = useState<string | null>(editingWidget?.type || null);
  const [kumaConfig, setKumaConfig] = useState({
    ...DEFAULT_KUMA_CONFIG,
    ...(editingWidget?.type === 'uptime-kuma' ? editingWidget.config : {}),
  });
  const [kumaMonitors, setKumaMonitors] = useState<KumaMonitorOption[]>([]);
  const [loadingMonitors, setLoadingMonitors] = useState(false);
  const [monitorError, setMonitorError] = useState<string | null>(null);

  const selectedIds = kumaConfig.selectedMonitorIds;

  useEffect(() => {
    if (selectedWidget !== 'uptime-kuma') return;

    const fetchDefaultUrl = async () => {
      if (kumaConfig.url) return;

      try {
        const response = await fetch('/api/settings');
        const settings = await response.json();
        setKumaConfig((current) => ({
          ...current,
          url: current.url || settings.uptime_kuma_url || '',
        }));
      } catch {
        // The widget API will still fall back to server-side settings.
      }
    };

    fetchDefaultUrl();
  }, [kumaConfig.url, selectedWidget]);

  const loadKumaMonitors = async () => {
    setLoadingMonitors(true);
    setMonitorError(null);

    const params = new URLSearchParams();
    if (kumaConfig.url) params.set('url', kumaConfig.url);
    params.set('slug', kumaConfig.slug || 'default');

    try {
      const response = await fetch(`/api/widgets/uptime-kuma?${params.toString()}`);
      const data = await response.json();

      if (!response.ok || data.error) {
        setKumaMonitors([]);
        setMonitorError(data.error || 'Unable to load monitors');
        return;
      }

      const monitors = data.monitors || [];
      setKumaMonitors(monitors);
      setKumaConfig((current) => ({
        ...current,
        selectedMonitorIds: current.selectedMonitorIds ?? monitors.map((monitor: KumaMonitorOption) => String(monitor.id)),
      }));
    } catch {
      setKumaMonitors([]);
      setMonitorError('Unable to load monitors');
    } finally {
      setLoadingMonitors(false);
    }
  };

  useEffect(() => {
    if (selectedWidget === 'uptime-kuma') {
      loadKumaMonitors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWidget]);

  const handleAdd = () => {
    if (selectedWidget) {
      onAdd(selectedWidget, selectedWidget === 'uptime-kuma' ? kumaConfig : undefined);
    }
  };

  const toggleMonitor = (id: number | string) => {
    const normalizedId = String(id);
    const currentIds = selectedIds ?? kumaMonitors.map((monitor) => String(monitor.id));

    setKumaConfig((current) => ({
      ...current,
      selectedMonitorIds: currentIds.includes(normalizedId)
        ? currentIds.filter((selectedId) => selectedId !== normalizedId)
        : [...currentIds, normalizedId],
    }));
  };

  const toggleOption = (key: KumaDisplayOption) => {
    setKumaConfig((current) => ({ ...current, [key]: !current[key] }));
  };

  const isKumaSelected = selectedWidget === 'uptime-kuma';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass w-full max-w-3xl rounded-2xl">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{editingWidget ? 'Widget Settings' : 'Add Widget'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
          {!editingWidget && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {widgets.map((widget) => (
                <button
                  key={widget.id}
                  onClick={() => setSelectedWidget(widget.id)}
                  className={`p-4 rounded-xl transition-all text-left ${
                    selectedWidget === widget.id
                      ? 'glass ring-2 ring-accent-blue'
                      : 'glass-sm hover:glass'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <widget.icon size={20} className="text-accent-blue flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">{widget.name}</p>
                      <p className="text-xs text-gray-400 line-clamp-2">{widget.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {isKumaSelected && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-[1fr_160px_auto] gap-3">
                <label className="space-y-1">
                  <span className="text-xs text-gray-400">Uptime Kuma URL</span>
                  <input
                    value={kumaConfig.url}
                    onChange={(event) => setKumaConfig((current) => ({ ...current, url: event.target.value }))}
                    placeholder="https://kuma.example.com"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-blue"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-gray-400">Status slug</span>
                  <input
                    value={kumaConfig.slug}
                    onChange={(event) => setKumaConfig((current) => ({ ...current, slug: event.target.value }))}
                    placeholder="default"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-blue"
                  />
                </label>
                <button
                  onClick={loadKumaMonitors}
                  className="btn btn-secondary self-end flex items-center justify-center gap-2"
                  type="button"
                >
                  {loadingMonitors ? <Loader2 size={15} className="animate-spin" /> : null}
                  Load
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {KUMA_DISPLAY_OPTIONS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleOption(key)}
                    className={`px-3 py-2 rounded-lg text-xs text-left border transition-all ${
                      kumaConfig[key]
                        ? 'border-accent-blue bg-blue-500/10 text-white'
                        : 'border-white/10 bg-white/5 text-gray-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="glass-sm p-3 rounded-lg">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-sm font-medium">Monitors</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setKumaConfig((current) => ({
                        ...current,
                        selectedMonitorIds: kumaMonitors.map((monitor) => String(monitor.id)),
                      }))}
                      className="text-xs text-accent-blue hover:text-accent-cyan"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setKumaConfig((current) => ({ ...current, selectedMonitorIds: [] }))}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      None
                    </button>
                  </div>
                </div>

                {monitorError && <p className="text-xs text-red-400">{monitorError}</p>}
                {!monitorError && !kumaMonitors.length && (
                  <p className="text-xs text-gray-400">Load a status page to choose monitors.</p>
                )}
                <div className="grid sm:grid-cols-2 gap-2">
                  {kumaMonitors.map((monitor) => {
                    const checked = (selectedIds ?? kumaMonitors.map((item) => String(item.id))).includes(String(monitor.id));
                    return (
                      <button
                        key={monitor.id}
                        type="button"
                        onClick={() => toggleMonitor(monitor.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg text-left text-sm border ${
                          checked
                            ? 'border-accent-blue bg-blue-500/10'
                            : 'border-white/10 bg-white/5'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded border flex items-center justify-center ${
                          checked ? 'border-accent-blue bg-accent-blue' : 'border-white/20'
                        }`}>
                          {checked && <Check size={13} />}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate">{monitor.name}</span>
                          {monitor.groupName && <span className="block text-xs text-gray-500 truncate">{monitor.groupName}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex gap-3">
          <button onClick={onClose} className="flex-1 btn btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedWidget}
            className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {editingWidget ? 'Save Settings' : 'Add Widget'}
          </button>
        </div>
      </div>
    </div>
  );
}
