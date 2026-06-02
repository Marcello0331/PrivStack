'use client';

export const dynamic = 'force-dynamic';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import AppLauncherBar from '@/components/apps/AppLauncherBar';
import AppFormModal from '@/components/apps/AppFormModal';
import DashboardGrid from '@/components/dashboard/DashboardGrid';
import type { AppPayload } from '@/components/apps/types';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [showAddApp, setShowAddApp] = useState(false);
  const [savingApp, setSavingApp] = useState(false);
  const [appError, setAppError] = useState('');
  const [appRefreshKey, setAppRefreshKey] = useState(0);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const response = await fetch('/api/setup/check');
        const data = await response.json();
        setIsSetupComplete(data.complete);
        if (!data.complete) {
          router.push('/setup');
        }
      } catch {
        router.push('/setup');
      }
    };

    if (session) {
      checkSetup();
    }
  }, [session, router]);

  if (status === 'loading' || !isSetupComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const saveApp = async (payload: AppPayload) => {
    setSavingApp(true);
    setAppError('');

    try {
      const response = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save app');
      }
      setShowAddApp(false);
      setAppRefreshKey((current) => current + 1);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : 'Failed to save app');
    } finally {
      setSavingApp(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        editMode={editMode}
        onToggleEditMode={() => setEditMode((current) => !current)}
        onAddWidget={() => setShowAddWidget(true)}
        onAddApp={() => setShowAddApp(true)}
      />
      <AppLauncherBar refreshKey={appRefreshKey} />
      <div className="pt-4">
        <DashboardGrid
          editMode={editMode}
          onExitEditMode={() => setEditMode(false)}
          showAddWidget={showAddWidget}
          onCloseAddWidget={() => setShowAddWidget(false)}
        />
      </div>
      {showAddApp && (
        <AppFormModal
          error={appError}
          saving={savingApp}
          onClose={() => {
            setShowAddApp(false);
            setAppError('');
          }}
          onSave={saveApp}
        />
      )}
    </div>
  );
}
