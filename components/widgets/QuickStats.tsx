'use client';

import { useState, useEffect } from 'react';

export default function QuickStatsWidget({ config }: { config?: Record<string, any> }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const response = await fetch('/api/widgets/quick-stats');
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch quick stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !stats) return null;

  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <div className="glass-sm px-3 py-1 rounded-full">Uptime: {stats?.uptime || 'N/A'}</div>
      <div className="glass-sm px-3 py-1 rounded-full">Containers: {stats?.containers || 0}</div>
      <div className="glass-sm px-3 py-1 rounded-full">Torrents: {stats?.torrents || 0}</div>
      <div className="glass-sm px-3 py-1 rounded-full">Sonarr: {stats?.sonarrQueue || 0}</div>
      <div className="glass-sm px-3 py-1 rounded-full">Radarr: {stats?.radarrQueue || 0}</div>
    </div>
  );
}
