'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Edit3, ExternalLink, Pin, PinOff, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import AppFormModal from './AppFormModal';
import type { AppPayload, AppRecord } from './types';

export default function AppManager() {
  const { data: session, status } = useSession();
  const [apps, setApps] = useState<AppRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('all');
  const [editingApp, setEditingApp] = useState<AppRecord | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [discoveredApps, setDiscoveredApps] = useState<DiscoveredApp[]>([]);
  const [selectedDiscovered, setSelectedDiscovered] = useState<Set<string>>(new Set());
  const [discovering, setDiscovering] = useState(false);
  const [importing, setImporting] = useState(false);
  const [discoveryMessage, setDiscoveryMessage] = useState('');

  const categories = useMemo(() => {
    const values = apps.map((app) => app.category || 'default');
    return ['all', ...Array.from(new Set(values)).sort((a, b) => a.localeCompare(b))];
  }, [apps]);

  const visibleApps = category === 'all'
    ? apps
    : apps.filter((app) => (app.category || 'default') === category);

  const isAdmin = (session?.user as any)?.role === 'admin';

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (isAdmin) {
      fetchApps();
    } else {
      setLoading(false);
    }
  }, [isAdmin, status]);

  const fetchApps = async () => {
    setError('');
    try {
      const response = await fetch('/api/apps');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch apps');
      }
      setApps(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch apps');
    } finally {
      setLoading(false);
    }
  };

  const saveApp = async (payload: AppPayload, targetApp = editingApp) => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch(targetApp ? `/api/apps/${targetApp.id}` : '/api/apps', {
        method: targetApp ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save app');
      }
      setShowForm(false);
      setEditingApp(null);
      await fetchApps();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save app');
    } finally {
      setSaving(false);
    }
  };

  const deleteApp = async (app: AppRecord) => {
    if (!confirm(`Delete ${app.name}?`)) return;

    setError('');
    try {
      const response = await fetch(`/api/apps/${app.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete app');
      }
      await fetchApps();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete app');
    }
  };

  const togglePinned = async (app: AppRecord) => {
    const payload: AppPayload = {
      name: app.name,
      url: app.url,
      icon_url: app.icon_url || '',
      description: app.description || '',
      category: app.category || 'default',
      open_in: app.open_in || 'tab',
      pinned: !app.pinned,
    };
    await saveApp(payload, app);
  };

  const discoverDockerApps = async () => {
    setDiscovering(true);
    setDiscoveryMessage('');
    setError('');

    try {
      const response = await fetch('/api/apps/discover/docker');
      const data = await response.json();
      if (!response.ok) {
        const warning = data.warnings?.[0];
        throw new Error(warning?.message || warning?.hint || data.error || 'Docker discovery failed');
      }

      const discovered = data.apps || [];
      setDiscoveredApps(discovered);
      setSelectedDiscovered(new Set(discovered.filter((app: DiscoveredApp) => !app.duplicate).map(discoveryKey)));
      setDiscoveryMessage(discovered.length ? `Found ${discovered.length} Docker apps.` : 'No Docker apps discovered.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Docker discovery failed');
    } finally {
      setDiscovering(false);
    }
  };

  const toggleDiscovered = (app: DiscoveredApp) => {
    const key = discoveryKey(app);
    setSelectedDiscovered((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const importSelectedApps = async () => {
    const appsToImport = discoveredApps.filter((app) => selectedDiscovered.has(discoveryKey(app)));
    if (!appsToImport.length) return;

    setImporting(true);
    setError('');

    try {
      const response = await fetch('/api/apps/discover/docker/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apps: appsToImport }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to import discovered apps');
      }

      setDiscoveryMessage(`Imported ${data.imported || 0} apps. Skipped ${data.skipped || 0} duplicates.`);
      setDiscoveredApps([]);
      setSelectedDiscovered(new Set());
      await fetchApps();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import discovered apps');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return <div className="text-gray-400">Loading apps...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="glass-sm rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-2">Apps</h2>
        <p className="text-sm text-gray-400">Only admins can manage launcher apps.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Apps</h2>
          <p className="text-sm text-gray-400">Manage launcher entries, categories, icons, and status targets.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={fetchApps} className="btn btn-secondary flex items-center gap-2">
            <RefreshCw size={16} />
            Refresh
          </button>
          <button onClick={discoverDockerApps} disabled={discovering} className="btn btn-secondary flex items-center gap-2 disabled:opacity-50">
            <Search size={16} className={discovering ? 'animate-pulse' : ''} />
            Discover Docker
          </button>
          <button
            onClick={() => {
              setEditingApp(null);
              setShowForm(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            Add App
          </button>
        </div>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm">{error}</div>}
      {discoveryMessage && <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-100 text-sm">{discoveryMessage}</div>}

      {discoveredApps.length > 0 && (
        <div className="rounded-lg border border-white/10 overflow-hidden">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-4 py-3 bg-white/5">
            <div>
              <h3 className="text-sm font-semibold">Discovered Docker apps</h3>
              <p className="text-xs text-gray-400">Review before importing. Label matches are more reliable than port guesses.</p>
            </div>
            <button
              onClick={importSelectedApps}
              disabled={importing || selectedDiscovered.size === 0}
              className="btn btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Check size={16} />
              Import {selectedDiscovered.size}
            </button>
          </div>
          {discoveredApps.map((app) => {
            const selected = selectedDiscovered.has(discoveryKey(app));
            return (
              <button
                key={discoveryKey(app)}
                type="button"
                onClick={() => !app.duplicate && toggleDiscovered(app)}
                disabled={app.duplicate}
                className={`w-full grid md:grid-cols-[32px_1.2fr_1fr_0.7fr_0.7fr] gap-3 px-4 py-3 border-t border-white/10 text-left items-center ${
                  selected ? 'bg-accent-blue/10' : app.duplicate ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5'
                }`}
              >
                <span className={`w-5 h-5 rounded border flex items-center justify-center ${
                  selected ? 'border-accent-blue bg-accent-blue text-white' : 'border-white/20'
                }`}>
                  {selected && <Check size={13} />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium truncate">{app.name}</span>
                  <span className="block text-xs text-gray-400 truncate">{app.containerName}</span>
                </span>
                <span className="text-xs text-accent-blue truncate">{app.url}</span>
                <span className="text-xs text-gray-300">{app.category}</span>
                <span className="text-xs text-gray-400">{app.duplicate ? 'Duplicate' : `${app.source} / ${app.confidence}`}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {categories.map((item) => (
          <button
            key={item}
            onClick={() => setCategory(item)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
              category === item ? 'bg-accent-blue text-white' : 'glass-sm text-gray-300 hover:text-white'
            }`}
          >
            {item === 'all' ? 'All' : item}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-white/10">
        <div className="hidden md:grid grid-cols-[1.4fr_1fr_0.8fr_0.6fr_0.7fr] gap-4 px-4 py-3 text-xs uppercase tracking-wide text-gray-500 bg-white/5">
          <span>App</span>
          <span>URL</span>
          <span>Category</span>
          <span>Pinned</span>
          <span className="text-right">Actions</span>
        </div>

        {visibleApps.length === 0 ? (
          <div className="p-6 text-sm text-gray-400">No apps found.</div>
        ) : (
          visibleApps.map((app) => (
            <div key={app.id} className="grid md:grid-cols-[1.4fr_1fr_0.8fr_0.6fr_0.7fr] gap-4 px-4 py-4 border-t border-white/10 items-center">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={app.icon_url || 'https://cdn.jsdelivr.net/gh/selfhst/icons/png/question.png'}
                  alt=""
                  className="w-10 h-10 rounded-lg object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'https://cdn.jsdelivr.net/gh/selfhst/icons/png/question.png';
                  }}
                />
                <div className="min-w-0">
                  <p className="font-medium truncate">{app.name}</p>
                  <p className="text-xs text-gray-400 truncate">{app.description || 'No description'}</p>
                </div>
              </div>
              <a href={app.url} target="_blank" rel="noreferrer" className="text-sm text-accent-blue hover:text-white truncate flex items-center gap-1">
                <span className="truncate">{app.url}</span>
                <ExternalLink size={14} />
              </a>
              <span className="text-sm text-gray-300">{app.category || 'default'}</span>
              <span className={`text-sm ${app.pinned ? 'text-green-400' : 'text-gray-500'}`}>{app.pinned ? 'Yes' : 'No'}</span>
              <div className="flex justify-end gap-2">
                <button onClick={() => togglePinned(app)} className="p-2 rounded-lg glass-hover" title={app.pinned ? 'Unpin' : 'Pin'}>
                  {app.pinned ? <PinOff size={16} /> : <Pin size={16} />}
                </button>
                <button
                  onClick={() => {
                    setEditingApp(app);
                    setShowForm(true);
                  }}
                  className="p-2 rounded-lg glass-hover"
                  title="Edit"
                >
                  <Edit3 size={16} />
                </button>
                <button onClick={() => deleteApp(app)} className="p-2 rounded-lg glass-hover text-red-300" title="Delete">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <AppFormModal
          app={editingApp}
          error={error}
          saving={saving}
          onClose={() => {
            setShowForm(false);
            setEditingApp(null);
            setError('');
          }}
          onSave={saveApp}
        />
      )}
    </div>
  );
}

interface DiscoveredApp {
  name: string;
  url: string;
  icon_url: string;
  description: string;
  category: string;
  open_in: 'tab';
  pinned: boolean;
  source: string;
  containerName: string;
  confidence: string;
  duplicate?: boolean;
}

function discoveryKey(app: DiscoveredApp) {
  return `${app.containerName}:${app.url}`;
}
