'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { getWidgetRegistry } from '@/lib/widgetRegistry';

interface AddWidgetModalProps {
  onAdd: (widgetId: string, config?: Record<string, any>) => void;
  onClose: () => void;
}

export default function AddWidgetModal({ onAdd, onClose }: AddWidgetModalProps) {
  const widgets = getWidgetRegistry();
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);

  const handleAdd = () => {
    if (selectedWidget) {
      onAdd(selectedWidget);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass w-full max-w-2xl rounded-2xl">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add Widget</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
          {widgets.map((widget) => (
            <button
              key={widget.id}
              onClick={() => setSelectedWidget(widget.id)}
              className={`p-4 rounded-xl transition-all text-left ${
                selectedWidget === widget.id
                  ? 'glass ring-2 ring-accent-blue'
                  : 'glass-sm hover:glass'
              }`}
            >
              <div className="flex items-start gap-2">
                <widget.icon size={20} className="text-accent-blue flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">{widget.name}</p>
                  <p className="text-xs text-gray-400 line-clamp-2">{widget.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex gap-3">
          <button onClick={onClose} className="flex-1 btn btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedWidget}
            className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Widget
          </button>
        </div>
      </div>
    </div>
  );
}
