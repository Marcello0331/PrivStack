'use client';

import { useState, useEffect } from 'react';

export default function UptimeKumaWidget({ config }: { config?: Record<string, any> }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/widgets/uptime-kuma');
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch Uptime Kuma data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>;
  if (data?.error) return <div className="text-red-400 text-sm">Configure Uptime Kuma in settings</div>;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="glass-sm p-3 rounded-lg text-center">
          <div className="text-xl font-bold text-green-400">{data?.upCount || 0}</div>
          <div className="text-xs text-gray-400">Up</div>
        </div>
        <div className="glass-sm p-3 rounded-lg text-center">
          <div className="text-xl font-bold text-red-400">{data?.downCount || 0}</div>
          <div className="text-xs text-gray-400">Down</div>
        </div>
      </div>
    </div>
  );
}
