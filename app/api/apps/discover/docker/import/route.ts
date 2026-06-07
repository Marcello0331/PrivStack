import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '../../../../auth/config';
import { importDiscoveredApps } from '@/lib/dockerDiscovery';

export const dynamic = 'force-dynamic';

const discoveredAppSchema = z.object({
  name: z.string().trim().min(1),
  url: z.string().trim().url().refine((value) => /^https?:\/\//i.test(value)),
  icon_url: z.string().trim().url().or(z.literal('')).optional().default(''),
  description: z.string().trim().optional().default(''),
  category: z.string().trim().optional().default('Docker'),
  open_in: z.literal('tab').optional().default('tab'),
  pinned: z.boolean().optional().default(true),
  source: z.enum(['privstack-labels', 'homepage-labels', 'homarr-labels', 'traefik-labels', 'published-port']),
  containerName: z.string().trim().min(1),
  confidence: z.enum(['high', 'medium', 'low']),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const apps = z.array(discoveredAppSchema).parse(body.apps || []);
    const result = importDiscoveredApps(apps);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Docker discovery import error:', error);
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Invalid discovered apps', details: (error as any).issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
