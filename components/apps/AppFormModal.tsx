'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { AppPayload, AppRecord } from './types';

const DEFAULT_ICON = 'https://cdn.jsdelivr.net/gh/selfhst/icons/png/question.png';

function iconSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function suggestedIconUrl(name: string) {
  const slug = iconSlug(name);
  return slug ? `https://cdn.jsdelivr.net/gh/selfhst/icons/png/${slug}.png` : DEFAULT_ICON;
}

function getInitialPayload(app?: AppRecord | null): AppPayload {
  return {
    name: app?.name || '',
    url: app?.url || '',
    icon_url: app?.icon_url || '',
    description: app?.description || '',
    category: app?.category || 'default',
    open_in: app?.open_in || 'newwindow',
    pinned: app ? Boolean(app.pinned) : true,
  };
}

export default function AppFormModal({
  app,
  error,
  saving,
  onClose,
  onSave,
}: {
  app?: AppRecord | null;
  error?: string;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: AppPayload) => Promise<void>;
}) {
  const [form, setForm] = useState<AppPayload>(getInitialPayload(app));
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setForm(getInitialPayload(app));
    setLocalError('');
  }, [app]);

  const previewIcon = form.icon_url || suggestedIconUrl(form.name);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!form.name.trim()) {
      setLocalError('App name is required.');
      return;
    }

    if (!/^https?:\/\/.+/i.test(form.url.trim())) {
      setLocalError('URL must start with http:// or https://.');
      return;
    }

    await onSave({
      ...form,
      name: form.name.trim(),
      url: form.url.trim(),
      icon_url: (form.icon_url || suggestedIconUrl(form.name)).trim(),
      description: form.description.trim(),
      category: (form.category || 'default').trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <form onSubmit={handleSubmit} className="glass w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{app ? 'Edit App' : 'Add App'}</h2>
            <p className="text-sm text-gray-400">Manage launcher details, status, and icon metadata.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg glass-hover" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid md:grid-cols-[1fr_auto] gap-5 items-start">
            <div className="space-y-4">
              <Field label="Name">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full glass-sm px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-blue rounded-lg"
                  placeholder="Sonarr"
                  disabled={saving}
                />
              </Field>

              <Field label="URL">
                <input
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  className="w-full glass-sm px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-blue rounded-lg"
                  placeholder="http://192.168.0.131:8989"
                  disabled={saving}
                />
              </Field>
            </div>

            <div className="glass-sm rounded-lg p-4 w-full md:w-36 flex flex-col items-center gap-3">
              <img
                src={previewIcon}
                alt=""
                className="w-16 h-16 rounded-xl object-cover"
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_ICON;
                }}
              />
              <button
                type="button"
                onClick={() => setForm({ ...form, icon_url: suggestedIconUrl(form.name) })}
                className="text-xs text-accent-blue hover:text-white transition-all"
                disabled={saving}
              >
                Use suggested icon
              </button>
            </div>
          </div>

          <Field label="Icon URL">
            <input
              value={form.icon_url}
              onChange={(e) => setForm({ ...form, icon_url: e.target.value })}
              className="w-full glass-sm px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-blue rounded-lg"
              placeholder={suggestedIconUrl(form.name || 'app')}
              disabled={saving}
            />
          </Field>

          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full glass-sm px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-blue rounded-lg min-h-20"
              placeholder="What this service does"
              disabled={saving}
            />
          </Field>

          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Category">
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full glass-sm px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-blue rounded-lg"
                placeholder="Media"
                disabled={saving}
              />
            </Field>

            <Field label="Open">
              <select
                value={form.open_in}
                onChange={(e) => setForm({ ...form, open_in: e.target.value })}
                className="w-full glass-sm px-4 py-2 text-white bg-bg-dark focus:outline-none focus:ring-2 focus:ring-accent-blue rounded-lg"
                disabled={saving}
              >
                <option value="tab">Current tab</option>
                <option value="newwindow">New tab</option>
              </select>
            </Field>

            <label className="glass-sm rounded-lg px-4 py-3 flex items-center gap-3 mt-7">
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
                disabled={saving}
              />
              <span className="text-sm">Pinned to launcher</span>
            </label>
          </div>

          {(localError || error) && (
            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm">
              {localError || error}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/10 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save App'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-2">{label}</span>
      {children}
    </label>
  );
}
