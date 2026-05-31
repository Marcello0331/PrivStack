'use client';

import { useState, useEffect } from 'react';

export default function SonarrWidget({ config }: { config?: Record<string, any> }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const response = await fetch('/api/widgets/sonarr');
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch Sonarr data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetch();
    const interval = setInterval(fetch, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>;
  if (data?.error) return <div className="text-red-400 text-sm">Configure Sonarr in settings</div>;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="glass-sm p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-accent-blue">{data?.seriesCount || 0}</div>
          <div className="text-xs text-gray-400">Series</div>
        </div>
        <div className="glass-sm p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-accent-cyan">{data?.queueSize || 0}</div>
          <div className="text-xs text-gray-400">Queue</div>
        </div>
      </div>

      <div className="text-xs text-gray-400">
        <p>Latest: {data?.lastAdded || 'N/A'}</p>
      </div>
    </div>
  );
}
