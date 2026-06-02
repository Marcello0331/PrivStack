'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Edit3, Plus, Settings } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AppTile from './AppTile';
import AppFormModal from './AppFormModal';
import type { AppPayload, AppRecord } from './types';

export default function AppLauncherBar({ refreshKey = 0 }: { refreshKey?: number }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [apps, setApps] = useState<AppRecord[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApps();
  }, [refreshKey]);

  const isAdmin = (session?.user as any)?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      setEditMode(false);
      setShowForm(false);
    }
  }, [isAdmin]);

  const fetchApps = async () => {
    setError('');
    try {
      const response = await fetch('/api/apps?pinned=1');
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

  const saveApp = async (payload: AppPayload) => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save app');
      }
      setShowForm(false);
      await fetchApps();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save app');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  const groupedApps = apps.reduce<Record<string, AppRecord[]>>((groups, app) => {
    const category = app.category || 'default';
    groups[category] = groups[category] || [];
    groups[category].push(app);
    return groups;
  }, {});

  return (
    <div className={`transition-all ${collapsed ? 'h-12' : 'h-auto'}`}>
      <div className="pt-20 px-6 pb-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-lg glass-sm hover:bg-white/10 transition-all inline-flex items-center gap-1 text-sm text-gray-400"
          >
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            <span>Apps</span>
          </button>
          {!collapsed && isAdmin && (
            <>
              <button
                onClick={() => setEditMode(!editMode)}
                className={`p-1.5 rounded-lg transition-all inline-flex items-center gap-1 text-sm ${
                  editMode ? 'bg-accent-blue text-white' : 'glass-sm text-gray-400 hover:text-white'
                }`}
              >
                <Edit3 size={14} />
                <span>{editMode ? 'Done' : 'Edit'}</span>
              </button>
              <button
                onClick={() => router.push('/settings?tab=apps')}
                className="p-1.5 rounded-lg glass-sm hover:bg-white/10 transition-all inline-flex items-center gap-1 text-sm text-gray-400"
              >
                <Settings size={14} />
                <span>Manage</span>
              </button>
            </>
          )}
        </div>

        {!collapsed && (
          <div className="space-y-5">
            {error && <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm">{error}</div>}

            {Object.entries(groupedApps).map(([category, items]) => (
              <section key={category}>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{category}</h2>
                <div className="flex flex-wrap gap-3 items-start">
                  {items.map((app) => (
                    <AppTile key={app.id} app={app} editMode={editMode} onUpdate={fetchApps} />
                  ))}
                </div>
              </section>
            ))}

            {editMode && (
              <button
                onClick={() => setShowForm(true)}
                className="glass-sm hover:glass-hover p-3 rounded-xl transition-all flex flex-col items-center gap-2 w-20 h-24 justify-center"
              >
                <Plus size={24} className="text-accent-blue" />
                <span className="text-xs text-center">Add app</span>
              </button>
            )}
          </div>
        )}

        {showForm && (
          <AppFormModal
            error={error}
            saving={saving}
            onClose={() => {
              setShowForm(false);
              setError('');
            }}
            onSave={saveApp}
          />
        )}
      </div>
    </div>
  );
}
