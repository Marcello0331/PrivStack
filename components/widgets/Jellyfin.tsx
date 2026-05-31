'use client';

import { useState, useEffect } from 'react';

export default function JellyfinWidget({ config }: { config?: Record<string, any> }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/widgets/jellyfin');
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch Jellyfin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>;
  if (data?.error) return <div className="text-red-400 text-sm">Configure Jellyfin in settings</div>;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="glass-sm p-3 rounded-lg text-center">
          <div className="text-xl font-bold text-accent-blue">{data?.activeSessions || 0}</div>
          <div className="text-xs text-gray-400">Active</div>
        </div>
        <div className="glass-sm p-3 rounded-lg text-center">
          <div className="text-xl font-bold text-accent-cyan">{data?.recentlyAdded || 0}</div>
          <div className="text-xs text-gray-400">Recent</div>
        </div>
      </div>
      <div className="text-xs text-gray-400">
        <p>Movies: {data?.movieCount || 0}</p>
        <p>Shows: {data?.showCount || 0}</p>
      </div>
    </div>
  );
}
