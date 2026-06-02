'use client';

import { useState, useEffect } from 'react';

export default function RadarrWidget({ config }: { config?: Record<string, any> }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        if (config?.connectionId) params.set('connectionId', String(config.connectionId));
        const response = await fetch(`/api/widgets/radarr?${params.toString()}`);
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch Radarr data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [config?.connectionId]);

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>;
  if (data?.error) return <div className="text-red-400 text-sm">Configure Radarr in settings</div>;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="glass-sm p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-accent-blue">{data?.movieCount || 0}</div>
          <div className="text-xs text-gray-400">Movies</div>
        </div>
        <div className="glass-sm p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-accent-cyan">{data?.missingCount || 0}</div>
          <div className="text-xs text-gray-400">Missing</div>
        </div>
      </div>

      <div className="text-xs text-gray-400">
        <p>Queue: {data?.queueSize || 0} items</p>
      </div>
    </div>
  );
}
