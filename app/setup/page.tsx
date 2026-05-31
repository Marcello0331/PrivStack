'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const DEFAULT_APPS = [
  { name: 'Sonarr', url: 'http://192.168.0.131:8989', icon: 'sonarr' },
  { name: 'Radarr', url: 'http://192.168.0.131:7878', icon: 'radarr' },
  { name: 'Jellyfin', url: 'http://192.168.0.131:8096', icon: 'jellyfin' },
  { name: 'Plex', url: 'http://192.168.0.131:32400', icon: 'plex' },
  { name: 'qBittorrent', url: 'http://192.168.0.131:8080', icon: 'qbittorrent' },
  { name: 'Portainer', url: 'http://192.168.0.131:9000', icon: 'portainer' },
  { name: 'Uptime Kuma', url: 'http://192.168.0.131:3001', icon: 'uptime-kuma' },
  { name: 'Open WebUI', url: 'http://192.168.0.131:3000', icon: 'open-webui' },
];

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<'admin' | 'apps' | 'complete'>('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Admin creation
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2: Apps
  const [selectedApps, setSelectedApps] = useState<Set<string>>(
    new Set(DEFAULT_APPS.map((_, i) => String(i)))
  );
  const [appUrls, setAppUrls] = useState<Record<string, string>>(
    DEFAULT_APPS.reduce((acc, app, i) => {
      acc[String(i)] = app.url;
      return acc;
    }, {} as Record<string, string>)
  );

  // Step 1: Create admin account
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/setup/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to create admin account');
        return;
      }

      setStep('apps');
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Configure apps
  const handleConfigureApps = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apps = DEFAULT_APPS.filter((_, i) => selectedApps.has(String(i))).map((app, i) => ({
        name: app.name,
        url: appUrls[String(DEFAULT_APPS.indexOf(app))] || app.url,
        icon_url: `https://cdn.jsdelivr.net/gh/selfhst/icons/png/${app.icon}.png`,
        category: 'default',
        pinned: 1,
      }));

      const response = await fetch('/api/setup/configure-apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apps }),
      });

      if (!response.ok) {
        setError('Failed to configure apps');
        return;
      }

      setStep('complete');
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Finish
  const handleFinish = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/setup/complete', {
        method: 'POST',
      });

      if (response.ok) {
        router.push('/login');
      } else {
        setError('Failed to complete setup');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass w-full max-w-2xl">
        <div className="p-8">
          <h1 className="text-3xl font-bold gradient-text text-center mb-8">PrivStack Setup</h1>

          {step === 'admin' && (
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Create Admin Account</h2>

              <div>
                <label className="block text-sm font-medium mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full glass-sm px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-blue"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full glass-sm px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-blue"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full glass-sm px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-blue"
                  disabled={loading}
                />
              </div>

              {error && <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm">{error}</div>}

              <button type="submit" disabled={loading} className="w-full btn btn-primary mt-6">
                {loading ? 'Creating...' : 'Continue'}
              </button>
            </form>
          )}

          {step === 'apps' && (
            <form onSubmit={handleConfigureApps} className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Add Your Apps</h2>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {DEFAULT_APPS.map((app, idx) => (
                  <div key={idx} className="glass-sm p-3 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedApps.has(String(idx))}
                      onChange={(e) => {
                        const newSelected = new Set(selectedApps);
                        if (e.target.checked) {
                          newSelected.add(String(idx));
                        } else {
                          newSelected.delete(String(idx));
                        }
                        setSelectedApps(newSelected);
                      }}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{app.name}</p>
                      <input
                        type="text"
                        value={appUrls[String(idx)] || app.url}
                        onChange={(e) => setAppUrls({ ...appUrls, [String(idx)]: e.target.value })}
                        className="w-full glass-sm px-2 py-1 text-sm text-white mt-1 focus:outline-none focus:ring-2 focus:ring-accent-blue"
                        disabled={!selectedApps.has(String(idx))}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {error && <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm">{error}</div>}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setStep('admin')}
                  disabled={loading}
                  className="flex-1 btn btn-secondary"
                >
                  Back
                </button>
                <button type="submit" disabled={loading} className="flex-1 btn btn-primary">
                  {loading ? 'Saving...' : 'Continue'}
                </button>
              </div>
            </form>
          )}

          {step === 'complete' && (
            <div className="space-y-4 text-center">
              <div className="text-6xl mb-4">✓</div>
              <h2 className="text-2xl font-semibold">Setup Complete!</h2>
              <p className="text-gray-400">Your PrivStack dashboard is ready to use.</p>

              <button
                onClick={handleFinish}
                disabled={loading}
                className="w-full btn btn-primary mt-6"
              >
                {loading ? 'Redirecting...' : 'Go to Dashboard'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
