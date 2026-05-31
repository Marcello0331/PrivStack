'use client';

import { useState, useEffect } from 'react';

export default function GrafanaEmbedWidget({ config }: { config?: Record<string, any> }) {
  const panelUrl = config?.panelUrl || '';

  if (!panelUrl) {
    return <div className="text-gray-400 text-sm">Configure Grafana panel URL in settings</div>;
  }

  return (
    <iframe
      src={panelUrl}
      className="w-full h-full border-0 rounded-lg"
      allowFullScreen
      style={{ height: 'calc(100% - 10px)' }}
    />
  );
}
