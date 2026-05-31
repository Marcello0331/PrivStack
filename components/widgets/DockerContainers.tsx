'use client';

import { useState, useEffect } from 'react';
import { Play, Square, RotateCw } from 'lucide-react';

export default function DockerContainersWidget({ config }: { config?: Record<string, any> }) {
  const [containers, setContainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContainers = async () => {
      try {
        const response = await fetch('/api/widgets/docker');
        const data = await response.json();
        setContainers(data.containers || []);
      } catch (error) {
        console.error('Failed to fetch containers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContainers();
    const interval = setInterval(fetchContainers, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>;

  const running = containers.filter((c) => c.state === 'running').length;
  const stopped = containers.filter((c) => c.state === 'exited').length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="glass-sm p-2 rounded-lg text-center">
          <div className="text-lg font-bold text-accent-blue">{running}</div>
          <div className="text-xs text-gray-400">Running</div>
        </div>
        <div className="glass-sm p-2 rounded-lg text-center">
          <div className="text-lg font-bold text-gray-400">{stopped}</div>
          <div className="text-xs text-gray-400">Stopped</div>
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto space-y-2">
        {containers.slice(0, 8).map((container) => (
          <div key={container.id} className="glass-sm p-2 rounded-lg text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium truncate">{container.name}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  container.state === 'running'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {container.state}
              </span>
            </div>
            <div className="text-gray-400">
              {container.image} • {container.uptime}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
