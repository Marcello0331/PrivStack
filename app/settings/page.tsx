'use client';

export const dynamic = 'force-dynamic';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Save, Upload } from 'lucide-react';
import AppManager from '@/components/apps/AppManager';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'services');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);

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
      window.dispatchEvent(new Event('privstack:settings-saved'));
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
              label="Prowlarr URL"
              key="prowlarr_url"
              value={settings['prowlarr_url'] || ''}
              onChange={(val) => setSettings({ ...settings, prowlarr_url: val })}
              placeholder="http://192.168.0.131:9696"
            />
            <ServiceInput
              label="Prowlarr API Key"
              key="prowlarr_api_key"
              value={settings['prowlarr_api_key'] || ''}
              onChange={(val) => setSettings({ ...settings, prowlarr_api_key: val })}
              placeholder="Your Prowlarr API key"
              type="password"
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
            <div className="glass-sm p-4 rounded-lg space-y-4">
              <h2 className="font-semibold">Theme</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <SelectInput
                  label="Mode"
                  value={settings['theme_mode'] || 'dark'}
                  onChange={(val) => setSettings({ ...settings, theme_mode: val })}
                  options={[
                    ['dark', 'Night'],
                    ['light', 'Day'],
                  ]}
                />
                <ServiceInput
                  label="Accent Color"
                  value={settings['accent_color'] || '#3b82f6'}
                  onChange={(val) => setSettings({ ...settings, accent_color: val })}
                  type="color"
                />
              </div>
            </div>

            <div className="glass-sm p-4 rounded-lg space-y-4">
              <h2 className="font-semibold">Background</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <SelectInput
                  label="Background Type"
                  value={settings['background_type'] || 'preset'}
                  onChange={(val) => setSettings({ ...settings, background_type: val })}
                  options={[
                    ['preset', 'Built-in preset'],
                    ['custom', 'Custom CSS background'],
                    ['image', 'Uploaded image'],
                  ]}
                />
                {(settings['background_type'] || 'preset') === 'preset' && (
                  <SelectInput
                    label="Preset"
                    value={settings['background_value'] || 'aurora'}
                    onChange={(val) => setSettings({ ...settings, background_value: val })}
                    options={[
                      ['aurora', 'Aurora'],
                      ['ember', 'Ember'],
                      ['forest', 'Forest'],
                      ['mono', 'Mono'],
                      ['none', 'None'],
                    ]}
                  />
                )}
                {settings['background_type'] === 'custom' && (
                  <ServiceInput
                    label="Custom CSS Background"
                    value={settings['background_value'] || ''}
                    onChange={(val) => setSettings({ ...settings, background_value: val })}
                    placeholder="linear-gradient(135deg, #0f172a, #111827)"
                  />
                )}
              </div>

              <label className="block">
                <span className="block text-sm font-medium mb-2">Upload Background Image</span>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;

                      setUploadingBackground(true);
                      try {
                        const formData = new FormData();
                        formData.append('file', file);
                        const response = await fetch('/api/settings/background', {
                          method: 'POST',
                          body: formData,
                        });
                        const data = await response.json();

                        if (!response.ok || !data.url) {
                          throw new Error(data.error || 'Upload failed');
                        }

                        setSettings((current) => ({
                          ...current,
                          background_type: 'image',
                          background_value: data.url,
                        }));
                        window.dispatchEvent(new Event('privstack:settings-saved'));
                      } catch (error) {
                        alert(error instanceof Error ? error.message : 'Upload failed');
                      } finally {
                        setUploadingBackground(false);
                        event.target.value = '';
                      }
                    }}
                    className="flex-1 glass-sm px-4 py-2 text-sm"
                  />
                  <div className="btn btn-secondary flex items-center gap-2 justify-center pointer-events-none">
                    {uploadingBackground ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    {uploadingBackground ? 'Uploading...' : 'PNG, JPG, WebP or GIF'}
                  </div>
                </div>
                {settings['background_type'] === 'image' && settings['background_value'] && (
                  <p className="text-xs text-gray-400 mt-2 truncate">Current image: {settings['background_value']}</p>
                )}
              </label>
            </div>

            <div className="glass-sm p-4 rounded-lg space-y-4">
              <h2 className="font-semibold">Surface Effects</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <RangeInput
                  label="Glass Opacity"
                  value={settings['glass_opacity'] || '0.05'}
                  min="0"
                  max="0.4"
                  step="0.01"
                  onChange={(val) => setSettings({ ...settings, glass_opacity: val })}
                />
                <RangeInput
                  label="Glass Blur"
                  value={settings['glass_blur'] || '12'}
                  min="0"
                  max="30"
                  step="1"
                  onChange={(val) => setSettings({ ...settings, glass_blur: val })}
                />
                <SelectInput
                  label="Particles"
                  value={settings['particles_enabled'] || 'true'}
                  onChange={(val) => setSettings({ ...settings, particles_enabled: val })}
                  options={[
                    ['true', 'Enabled'],
                    ['false', 'Disabled'],
                  ]}
                />
                <ServiceInput
                  label="Search Engine"
                  value={settings['search_engine'] || 'google'}
                  onChange={(val) => setSettings({ ...settings, search_engine: val })}
                />
              </div>
            </div>
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
        {(activeTab === 'services' || activeTab === 'appearance') && (
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

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full glass-sm px-4 py-2 text-white bg-bg-dark focus:outline-none focus:ring-2 focus:ring-accent-blue rounded-lg"
      >
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>{labelText}</option>
        ))}
      </select>
    </div>
  );
}

function RangeInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  min: string;
  max: string;
  step: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium">{label}</label>
        <span className="text-xs text-gray-400">{value}</span>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value)}
        className="w-full accent-[var(--accent-color)]"
      />
    </div>
  );
}
