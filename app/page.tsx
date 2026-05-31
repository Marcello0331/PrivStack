'use client';

export const dynamic = 'force-dynamic';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import AppLauncherBar from '@/components/apps/AppLauncherBar';
import DashboardGrid from '@/components/dashboard/DashboardGrid';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSetupComplete, setIsSetupComplete] = useState(false);

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

  return (
    <div className="min-h-screen">
      <Header />
      <AppLauncherBar />
      <div className="pt-4">
        <DashboardGrid />
      </div>
    </div>
  );
}
