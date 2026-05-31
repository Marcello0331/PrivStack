'use client';

import { useState, useEffect } from 'react';

export default function EsxiWidget({ config }: { config?: Record<string, any> }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/widgets/esxi');
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch ESXi data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>;
  if (data?.error) return <div className="text-red-400 text-sm">ESXi not configured</div>;

  return (
    <div className="space-y-3">
      <div className="glass-sm p-3 rounded-lg text-center">
        <div className="text-2xl font-bold text-accent-blue">{data?.vmCount || 0}</div>
        <div className="text-xs text-gray-400">Virtual Machines</div>
      </div>
    </div>
  );
}
