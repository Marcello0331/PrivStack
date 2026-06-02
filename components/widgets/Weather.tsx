'use client';

import { useState, useEffect } from 'react';
import { Cloud, CloudRain, Sun } from 'lucide-react';

export default function WeatherWidget({ config }: { config?: Record<string, any> }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        if (config?.connectionId) params.set('connectionId', String(config.connectionId));
        if (config?.lat) params.set('lat', String(config.lat));
        if (config?.lon) params.set('lon', String(config.lon));
        const response = await fetch(`/api/widgets/weather?${params.toString()}`);
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch weather data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 600000);
    return () => clearInterval(interval);
  }, [config?.connectionId, config?.lat, config?.lon]);

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>;
  if (data?.error) return <div className="text-red-400 text-sm">Weather unavailable</div>;

  return (
    <div className="space-y-3">
      <div className="text-center mb-4">
        <div className="text-3xl font-bold">{data?.temp || '--'}°C</div>
        <div className="text-sm text-gray-400">{data?.condition || 'Unknown'}</div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="glass-sm p-2 rounded-lg text-center">
          <div className="text-xs text-gray-400">Feels like</div>
          <div className="font-bold">{data?.feelsLike || '--'}°C</div>
        </div>
        <div className="glass-sm p-2 rounded-lg text-center">
          <div className="text-xs text-gray-400">Humidity</div>
          <div className="font-bold">{data?.humidity || '--'}%</div>
        </div>
      </div>
    </div>
  );
}
