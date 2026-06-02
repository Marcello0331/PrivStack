'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { AppRecord } from './types';

export default function AppTile({ app, editMode, onUpdate }: { app: AppRecord; editMode: boolean; onUpdate: () => void }) {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    checkStatus();
  }, [app.url]);

  const checkStatus = async () => {
    try {
      const response = await fetch(`/api/apps/ping?url=${encodeURIComponent(app.url)}`);
      const data = await response.json();
      setIsOnline(Boolean(data.online));
    } catch {
      setIsOnline(false);
    }
  };

  const handleRemove = async () => {
    if (confirm(`Remove ${app.name} from launcher?`)) {
      try {
        await fetch(`/api/apps/${app.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: app.name,
            url: app.url,
            icon_url: app.icon_url || '',
            description: app.description || '',
            category: app.category || 'default',
            open_in: app.open_in || 'tab',
            pinned: false,
          }),
        });
        onUpdate();
      } catch (error) {
        console.error('Failed to unpin app:', error);
      }
    }
  };

  const handleOpen = () => {
    const target = app.open_in === 'newwindow' ? '_blank' : '_self';
    window.open(app.url, target);
  };

  return (
    <div
      className="glass-sm hover:glass-hover p-3 rounded-xl transition-all flex flex-col items-center gap-2 w-20 h-24 relative cursor-pointer group"
      onClick={handleOpen}
    >
      {editMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRemove();
          }}
          className="absolute top-1 right-1 p-1 rounded-full bg-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X size={12} />
        </button>
      )}

      <div className="relative w-12 h-12">
        <img
          src={app.icon_url || 'https://cdn.jsdelivr.net/gh/selfhst/icons/png/question.png'}
          alt={app.name}
          className="w-12 h-12 rounded-lg object-cover"
          onError={(e) => {
            e.currentTarget.src = 'https://cdn.jsdelivr.net/gh/selfhst/icons/png/question.png';
          }}
        />
        <div
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border border-white/30 ${
            isOnline === true ? 'bg-green-500' : isOnline === false ? 'bg-red-500' : 'bg-gray-500'
          }`}
        />
      </div>

      <p className="text-xs text-center line-clamp-2 text-gray-200">{app.name}</p>
    </div>
  );
}
