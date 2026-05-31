import { NextRequest, NextResponse } from 'next/server';
import { markSetupComplete } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    markSetupComplete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Complete setup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
