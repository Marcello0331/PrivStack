'use client';

import { useEffect, useMemo, useState } from 'react';
import { Edit3, ExternalLink, Pin, PinOff, Plus, RefreshCw, Trash2 } from 'lucide-react';
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
