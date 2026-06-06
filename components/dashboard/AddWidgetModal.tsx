'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Loader2, Plus, X } from 'lucide-react';
import { getWidget, getWidgetRegistry } from '@/lib/widgetRegistry';

interface AddWidgetModalProps {
  onAdd: (widgetId: string, config?: Record<string, any>) => void;
  onClose: () => void;
  editingWidget?: {
    id: string;
    type: string;
    config?: Record<string, any>;
  };
}

interface ServiceConnection {
  id: number;
  type: string;
  name: string;
  url: string;
  hasApiKey?: boolean;
  hasToken?: boolean;
  hasExtraConfig?: boolean;
}

interface KumaMonitorOption {
  id: number | string;
  name: string;
  groupName?: string;
}

type Step = 'select' | 'customize';
type KumaDisplayOption = 'showSummary' | 'showMonitorList' | 'showHeartbeat' | 'showUptime';

const CONNECTION_WIDGETS = new Set([
  'sonarr',
  'radarr',
  'prowlarr',
  'qbittorrent',
  'jellyfin',
  'plex',
  'uptime-kuma',
  'weather',
  'esxi',
]);

const API_KEY_WIDGETS = new Set(['sonarr', 'radarr', 'prowlarr', 'jellyfin', 'weather']);
const TOKEN_WIDGETS = new Set(['plex']);

const KUMA_DISPLAY_OPTIONS: Array<{ key: KumaDisplayOption; label: string }> = [
  { key: 'showSummary', label: 'Summary' },
  { key: 'showMonitorList', label: 'Monitor list' },
  { key: 'showHeartbeat', label: 'Heartbeats' },
  { key: 'showUptime', label: 'Uptime' },
];

const DEFAULT_KUMA_CONFIG = {
  slug: 'default',
  selectedMonitorIds: undefined as string[] | undefined,
  showSummary: true,
  showMonitorList: true,
  showHeartbeat: true,
  showUptime: true,
};

const DEFAULT_CONNECTION_FORM = {
  name: '',
  url: '',
  api_key: '',
  token: '',
  username: '',
  password: '',
};

function initialConfig(type?: string, config?: Record<string, any>) {
  if (type === 'uptime-kuma') {
    return {
      ...DEFAULT_KUMA_CONFIG,
      ...config,
    };
  }

  if (type === 'weather') {
    return {
      lat: config?.lat || '47.4979',
      lon: config?.lon || '19.0402',
      ...config,
    };
  }

  return { ...(config || {}) };
}

export default function AddWidgetModal({ onAdd, onClose, editingWidget }: AddWidgetModalProps) {
  const widgets = getWidgetRegistry();
  const [step, setStep] = useState<Step>(editingWidget ? 'customize' : 'select');
  const [selectedWidget, setSelectedWidget] = useState<string | null>(editingWidget?.type || null);
  const [config, setConfig] = useState<Record<string, any>>(initialConfig(editingWidget?.type, editingWidget?.config));
  const [connections, setConnections] = useState<ServiceConnection[]>([]);
  const [connectionForm, setConnectionForm] = useState(DEFAULT_CONNECTION_FORM);
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [savingConnection, setSavingConnection] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [kumaMonitors, setKumaMonitors] = useState<KumaMonitorOption[]>([]);
  const [loadingMonitors, setLoadingMonitors] = useState(false);
  const [monitorError, setMonitorError] = useState('');

  const widget = selectedWidget ? getWidget(selectedWidget) : null;
  const needsConnection = Boolean(selectedWidget && CONNECTION_WIDGETS.has(selectedWidget));
  const needsApiKey = Boolean(selectedWidget && API_KEY_WIDGETS.has(selectedWidget));
  const needsToken = Boolean(selectedWidget && TOKEN_WIDGETS.has(selectedWidget));
  const selectedIds = config.selectedMonitorIds as string[] | undefined;

  const selectedConnection = useMemo(() => (
    connections.find((connection) => String(connection.id) === String(config.connectionId))
  ), [config.connectionId, connections]);

  useEffect(() => {
    setConfig(initialConfig(selectedWidget || undefined, editingWidget?.type === selectedWidget ? editingWidget.config : undefined));
    setKumaMonitors([]);
    setMonitorError('');
    setShowConnectionForm(false);
    setConnectionForm(DEFAULT_CONNECTION_FORM);
  }, [editingWidget?.config, editingWidget?.type, selectedWidget]);

  useEffect(() => {
    if (!selectedWidget || !needsConnection) {
      setConnections([]);
      return;
    }

    const fetchConnections = async () => {
      try {
        const response = await fetch(`/api/service-connections?type=${encodeURIComponent(selectedWidget)}`);
        const data = await response.json();
        setConnections(data.connections || []);
      } catch {
        setConnections([]);
      }
    };

    fetchConnections();
  }, [needsConnection, selectedWidget]);

  const chooseWidget = (widgetId: string) => {
    setSelectedWidget(widgetId);
    setStep('customize');
  };

  const createConnection = async () => {
    if (!selectedWidget) return;

    setSavingConnection(true);
    setConnectionError('');

    try {
      const response = await fetch('/api/service-connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedWidget,
          name: connectionForm.name,
          url: connectionForm.url,
          api_key: connectionForm.api_key,
          token: connectionForm.token,
          extra_json: selectedWidget === 'qbittorrent'
            ? JSON.stringify({
                username: connectionForm.username,
                password: connectionForm.password,
              })
            : '',
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.connection) {
        throw new Error(data.error || 'Failed to save connection');
      }

      setConnections((current) => [...current, data.connection].sort((a, b) => a.name.localeCompare(b.name)));
      setConfig((current) => ({ ...current, connectionId: data.connection.id }));
      setConnectionForm(DEFAULT_CONNECTION_FORM);
      setShowConnectionForm(false);
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Failed to save connection');
    } finally {
      setSavingConnection(false);
    }
  };

  const loadKumaMonitors = async () => {
    setLoadingMonitors(true);
    setMonitorError('');

    const params = new URLSearchParams();
    if (config.connectionId) params.set('connectionId', String(config.connectionId));
    params.set('slug', config.slug || 'default');

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
      setConfig((current) => ({
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

  const handleSave = () => {
    if (!selectedWidget) return;
    onAdd(selectedWidget, config);
  };

  const toggleMonitor = (id: number | string) => {
    const normalizedId = String(id);
    const currentIds = selectedIds ?? kumaMonitors.map((monitor) => String(monitor.id));

    setConfig((current) => ({
      ...current,
      selectedMonitorIds: currentIds.includes(normalizedId)
        ? currentIds.filter((selectedId) => selectedId !== normalizedId)
        : [...currentIds, normalizedId],
    }));
  };

  const toggleKumaOption = (key: KumaDisplayOption) => {
    setConfig((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass w-full max-w-4xl rounded-2xl">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step === 'customize' && !editingWidget && (
              <button
                onClick={() => setStep('select')}
                className="p-1 rounded-lg hover:bg-white/10"
                title="Back to widgets"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <h2 className="text-lg font-semibold">{editingWidget ? 'Widget Settings' : 'Add Widget'}</h2>
              <p className="text-xs text-gray-400">
                {step === 'select' ? 'Choose a widget for your home screen.' : `Customize ${widget?.name || 'widget'} before adding it.`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 max-h-[72vh] overflow-y-auto">
          {step === 'select' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {widgets.map((item) => (
                <button
                  key={item.id}
                  onClick={() => chooseWidget(item.id)}
                  className="glass-sm hover:glass p-4 rounded-xl transition-all text-left min-h-28"
                >
                  <div className="flex items-start gap-3">
                    <item.icon size={22} className="text-accent-blue flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-gray-400 line-clamp-3">{item.description}</p>
                      {item.configurable && <p className="text-[11px] text-accent-blue mt-2">Customizable</p>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 'customize' && selectedWidget && (
            <div className="space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <label className="space-y-1">
                  <span className="text-xs text-gray-400">Widget title</span>
                  <input
                    value={config.title || ''}
                    onChange={(event) => setConfig((current) => ({ ...current, title: event.target.value }))}
                    placeholder={widget?.name || 'Widget title'}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-blue"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-gray-400">Open link</span>
                  <input
                    value={config.openLink || ''}
                    onChange={(event) => setConfig((current) => ({ ...current, openLink: event.target.value }))}
                    placeholder={selectedConnection?.url || 'https://service.example.com'}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-blue"
                  />
                </label>
              </div>

              {needsConnection && (
                <div className="glass-sm p-4 rounded-lg space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Service connection</p>
                      <p className="text-xs text-gray-400">Secrets are stored server-side and only the connection is saved on the widget.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowConnectionForm(!showConnectionForm)}
                      className="btn btn-secondary flex items-center gap-2"
                    >
                      <Plus size={15} />
                      New
                    </button>
                  </div>

                  <select
                    value={config.connectionId || ''}
                    onChange={(event) => setConfig((current) => ({ ...current, connectionId: event.target.value || undefined }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-blue"
                  >
                    <option value="">Use global settings</option>
                    {connections.map((connection) => (
                      <option key={connection.id} value={connection.id}>
                        {connection.name} - {connection.url}
                      </option>
                    ))}
                  </select>

                  {showConnectionForm && (
                    <div className="grid md:grid-cols-2 gap-3 border-t border-white/10 pt-4">
                      <input
                        value={connectionForm.name}
                        onChange={(event) => setConnectionForm((current) => ({ ...current, name: event.target.value }))}
                        placeholder="Connection name"
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-blue"
                      />
                      <input
                        value={connectionForm.url}
                        onChange={(event) => setConnectionForm((current) => ({ ...current, url: event.target.value }))}
                        placeholder={selectedWidget === 'weather' ? 'https://api.openweathermap.org' : 'Service URL'}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-blue"
                      />
                      {needsApiKey && (
                        <input
                          value={connectionForm.api_key}
                          onChange={(event) => setConnectionForm((current) => ({ ...current, api_key: event.target.value }))}
                          placeholder="API key"
                          type="password"
                          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-blue"
                        />
                      )}
                      {needsToken && (
                        <input
                          value={connectionForm.token}
                          onChange={(event) => setConnectionForm((current) => ({ ...current, token: event.target.value }))}
                          placeholder="Token"
                          type="password"
                          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-blue"
                        />
                      )}
                      {selectedWidget === 'qbittorrent' && (
                        <>
                          <input
                            value={connectionForm.username}
                            onChange={(event) => setConnectionForm((current) => ({ ...current, username: event.target.value }))}
                            placeholder="Username"
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-blue"
                          />
                          <input
                            value={connectionForm.password}
                            onChange={(event) => setConnectionForm((current) => ({ ...current, password: event.target.value }))}
                            placeholder="Password"
                            type="password"
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-blue"
                          />
                        </>
                      )}
                      <div className="md:col-span-2 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={createConnection}
                          disabled={savingConnection}
                          className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
                        >
                          {savingConnection && <Loader2 size={15} className="animate-spin" />}
                          Save connection
                        </button>
                        {connectionError && <p className="text-xs text-red-400">{connectionError}</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedWidget === 'weather' && (
                <div className="grid md:grid-cols-2 gap-3">
                  <label className="space-y-1">
                    <span className="text-xs text-gray-400">Latitude</span>
                    <input
                      value={config.lat || ''}
                      onChange={(event) => setConfig((current) => ({ ...current, lat: event.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-blue"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-gray-400">Longitude</span>
                    <input
                      value={config.lon || ''}
                      onChange={(event) => setConfig((current) => ({ ...current, lon: event.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-blue"
                    />
                  </label>
                </div>
              )}

              {selectedWidget === 'grafana-embed' && (
                <label className="space-y-1 block">
                  <span className="text-xs text-gray-400">Grafana panel URL</span>
                  <input
                    value={config.panelUrl || ''}
                    onChange={(event) => setConfig((current) => ({ ...current, panelUrl: event.target.value }))}
                    placeholder="https://grafana.example.com/d-solo/..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-blue"
                  />
                </label>
              )}

              {selectedWidget === 'uptime-kuma' && (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-[1fr_auto] gap-3">
                    <label className="space-y-1">
                      <span className="text-xs text-gray-400">Status slug</span>
                      <input
                        value={config.slug || 'default'}
                        onChange={(event) => setConfig((current) => ({ ...current, slug: event.target.value }))}
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
                      Load monitors
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {KUMA_DISPLAY_OPTIONS.map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleKumaOption(key)}
                        className={`px-3 py-2 rounded-lg text-xs text-left border transition-all ${
                          config[key] !== false
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
                          onClick={() => setConfig((current) => ({
                            ...current,
                            selectedMonitorIds: kumaMonitors.map((monitor) => String(monitor.id)),
                          }))}
                          className="text-xs text-accent-blue hover:text-accent-cyan"
                        >
                          All
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfig((current) => ({ ...current, selectedMonitorIds: [] }))}
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

              {!widget?.configurable && (
                <div className="glass-sm p-4 rounded-lg text-sm text-gray-400">
                  This widget does not have advanced settings yet. You can still add it to the dashboard.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex gap-3">
          <button onClick={onClose} className="flex-1 btn btn-secondary">
            Cancel
          </button>
          {step === 'customize' && (
            <button
              onClick={handleSave}
              disabled={!selectedWidget}
              className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingWidget ? 'Save Settings' : 'Add Widget'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
