'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, ComposedChart } from 'recharts';

export default function SystemStatsWidget({ config }: { config?: Record<string, any> }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/widgets/system-stats');
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch system stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>;
  if (!data) return <div className="text-red-400 text-sm">Service unavailable</div>;

  return (
    <div className="space-y-4">
      {/* CPU */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">CPU</span>
          <span className="text-sm font-bold">{data.cpu?.toFixed(1) || 0}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-accent-blue to-accent-cyan h-2 rounded-full transition-all"
            style={{ width: `${Math.min(data.cpu || 0, 100)}%` }}
          />
        </div>
      </div>

      {/* RAM */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">Memory</span>
          <span className="text-sm font-bold">
            {data.memory?.used?.toFixed(1) || 0}GB / {data.memory?.total?.toFixed(1) || 0}GB
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-accent-blue to-accent-cyan h-2 rounded-full transition-all"
            style={{ width: `${Math.min(((data.memory?.used || 0) / (data.memory?.total || 1)) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Disk */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">Disk</span>
          <span className="text-sm font-bold">
            {data.disk?.used?.toFixed(1) || 0}GB / {data.disk?.total?.toFixed(1) || 0}GB
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-accent-blue to-accent-cyan h-2 rounded-full transition-all"
            style={{ width: `${Math.min(((data.disk?.used || 0) / (data.disk?.total || 1)) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Network */}
      {data.network && (
        <div>
          <div className="text-sm text-gray-400 mb-2">Network</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="glass-sm p-2 rounded-lg">
              <span className="text-gray-500">↓ {(data.network.down || 0).toFixed(2)} Mbps</span>
            </div>
            <div className="glass-sm p-2 rounded-lg">
              <span className="text-gray-500">↑ {(data.network.up || 0).toFixed(2)} Mbps</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
