'use client';

import { useState, useEffect } from 'react';

export default function QuickStatsWidget({ config }: { config?: Record<string, any> }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
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

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !stats) return null;

  const displayValue = (value: unknown) => (
    value === null || value === undefined ? '--' : String(value)
  );

  const items = [
    ['Uptime', stats?.uptime || 'N/A'],
    ['Containers', displayValue(stats?.containers)],
    ['Running', displayValue(stats?.runningContainers)],
    ['Torrents', displayValue(stats?.torrents)],
    ['Active', displayValue(stats?.activeTorrents)],
    ['Sonarr', displayValue(stats?.sonarrQueue)],
    ['Radarr', displayValue(stats?.radarrQueue)],
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px] leading-none" title={(stats?.warnings || []).join(', ')}>
      {items.map(([label, value]) => (
        <div key={label} className="glass-sm px-2 py-1 rounded-md whitespace-nowrap">
          <span className="text-gray-400">{label}</span>
          <span className="ml-1 text-white">{value}</span>
        </div>
      ))}
    </div>
  );
}
