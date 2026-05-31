'use client';

import { useState, useEffect } from 'react';

export default function QbittorrentWidget({ config }: { config?: Record<string, any> }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const response = await fetch('/api/widgets/qbittorrent');
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch qBittorrent data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>;
  if (data?.error) return <div className="text-red-400 text-sm">Configure qBittorrent in settings</div>;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="glass-sm p-3 rounded-lg">
          <div className="text-xs text-gray-400 mb-1">Speed</div>
          <div className="text-lg font-bold">↓ {data?.downSpeed?.toFixed(1) || 0}MB</div>
          <div className="text-sm">↑ {data?.upSpeed?.toFixed(1) || 0}MB</div>
        </div>
        <div className="glass-sm p-3 rounded-lg">
          <div className="text-xs text-gray-400 mb-1">Torrents</div>
          <div className="text-lg font-bold text-accent-blue">{data?.activeTorrents || 0}</div>
          <div className="text-xs text-gray-400">{data?.totalTorrents || 0} total</div>
        </div>
      </div>
    </div>
  );
}
