'use client';

export const dynamic = 'force-dynamic';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import AppManager from '@/components/apps/AppManager';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'services');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (!session) {
      router.push('/login');
      return;
    }

    fetchSettings();
  }, [session, status, router]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      alert('Settings saved successfully');
    } catch (error) {
      alert('Failed to save settings');
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-8">
      <div className="max-w-4xl mx-auto px-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-all">
          <ArrowLeft size={20} />
          Back
        </button>

        <h1 className="text-3xl font-bold gradient-text mb-8">Settings</h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-white/10">
          {['services', 'apps', 'users', 'appearance', 'about'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium transition-all border-b-2 capitalize ${
                activeTab === tab
                  ? 'border-accent-blue text-accent-blue'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Services Tab */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            <ServiceInput
              label="Glances URL"
              key="glances_url"
              value={settings['glances_url'] || ''}
              onChange={(val) => setSettings({ ...settings, glances_url: val })}
              placeholder="http://192.168.0.131:61208"
            />
            <ServiceInput
              label="Sonarr URL"
              key="sonarr_url"
              value={settings['sonarr_url'] || ''}
              onChange={(val) => setSettings({ ...settings, sonarr_url: val })}
              placeholder="http://192.168.0.131:8989"
            />
            <ServiceInput
              label="Sonarr API Key"
              key="sonarr_api_key"
              value={settings['sonarr_api_key'] || ''}
              onChange={(val) => setSettings({ ...settings, sonarr_api_key: val })}
              placeholder="Your Sonarr API key"
              type="password"
            />
            <ServiceInput
              label="Radarr URL"
              key="radarr_url"
              value={settings['radarr_url'] || ''}
              onChange={(val) => setSettings({ ...settings, radarr_url: val })}
              placeholder="http://192.168.0.131:7878"
            />
            <ServiceInput
              label="Radarr API Key"
              key="radarr_api_key"
              value={settings['radarr_api_key'] || ''}
              onChange={(val) => setSettings({ ...settings, radarr_api_key: val })}
              placeholder="Your Radarr API key"
              type="password"
            />
            <ServiceInput
              label="qBittorrent URL"
              key="qbittorrent_url"
              value={settings['qbittorrent_url'] || ''}
              onChange={(val) => setSettings({ ...settings, qbittorrent_url: val })}
              placeholder="http://192.168.0.131:8080"
            />
            <ServiceInput
              label="Jellyfin URL"
              key="jellyfin_url"
              value={settings['jellyfin_url'] || ''}
              onChange={(val) => setSettings({ ...settings, jellyfin_url: val })}
              placeholder="http://192.168.0.131:8096"
            />
            <ServiceInput
              label="Jellyfin API Key"
              key="jellyfin_api_key"
              value={settings['jellyfin_api_key'] || ''}
              onChange={(val) => setSettings({ ...settings, jellyfin_api_key: val })}
              placeholder="Your Jellyfin API key"
              type="password"
            />
            <ServiceInput
              label="Plex URL"
              key="plex_url"
              value={settings['plex_url'] || ''}
              onChange={(val) => setSettings({ ...settings, plex_url: val })}
              placeholder="http://192.168.0.131:32400"
            />
            <ServiceInput
              label="Plex Token"
              key="plex_token"
              value={settings['plex_token'] || ''}
              onChange={(val) => setSettings({ ...settings, plex_token: val })}
              placeholder="Your Plex token"
              type="password"
            />
            <ServiceInput
              label="Uptime Kuma URL"
              key="uptime_kuma_url"
              value={settings['uptime_kuma_url'] || ''}
              onChange={(val) => setSettings({ ...settings, uptime_kuma_url: val })}
              placeholder="http://192.168.0.131:3001"
            />
            <ServiceInput
              label="OpenWeatherMap API Key"
              key="openweathermap_api_key"
              value={settings['openweathermap_api_key'] || ''}
              onChange={(val) => setSettings({ ...settings, openweathermap_api_key: val })}
              placeholder="Your OpenWeatherMap API key"
              type="password"
            />
          </div>
        )}

        {/* Apps Tab */}
        {activeTab === 'apps' && <AppManager />}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <p className="text-gray-400 text-sm mb-4">User management coming soon</p>
          </div>
        )}

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div className="space-y-6">
            <ServiceInput
              label="Accent Color"
              value={settings['accent_color'] || '#3b82f6'}
              onChange={(val) => setSettings({ ...settings, accent_color: val })}
              type="color"
            />
            <ServiceInput
              label="Search Engine"
              value={settings['search_engine'] || 'google'}
              onChange={(val) => setSettings({ ...settings, search_engine: val })}
            />
          </div>
        )}

        {/* About Tab */}
        {activeTab === 'about' && (
          <div className="space-y-4 text-sm">
            <div className="glass-sm p-4 rounded-lg">
              <p className="text-gray-400">PrivStack v1.0.0</p>
              <p className="text-gray-500 text-xs">Self-hosted homelab dashboard</p>
            </div>
            <div className="glass-sm p-4 rounded-lg">
              <p className="text-gray-400">Server: {typeof window !== 'undefined' ? window.location.hostname : 'unknown'}</p>
              <p className="text-gray-400">User: {session?.user?.name}</p>
            </div>
          </div>
        )}

        {/* Save Button */}
        {activeTab === 'services' && (
          <div className="mt-8 flex gap-3">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 btn btn-primary">
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ServiceInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full glass-sm px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-blue rounded-lg"
      />
    </div>
  );
}
