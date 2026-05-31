'use client';

import { useState, useEffect } from 'react';
import AppTile from '@/components/apps/AppTile';

export default function AppShortcutsWidget({ config }: { config?: Record<string, any> }) {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const response = await fetch('/api/apps');
        const data = await response.json();
        setApps(data);
      } catch (error) {
        console.error('Failed to fetch apps:', error);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, []);

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>;

  return (
    <div className="flex flex-wrap gap-3">
      {apps.slice(0, 12).map((app) => (
        <AppTile key={app.id} app={app} editMode={false} onUpdate={() => {}} />
      ))}
    </div>
  );
}
