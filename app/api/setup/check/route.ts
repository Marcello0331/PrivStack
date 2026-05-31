import { NextResponse } from 'next/server';
import { isSetupComplete } from '@/lib/settings';
import { getAllUsers } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const users = getAllUsers();
    const setupComplete = isSetupComplete();

    return NextResponse.json({
      complete: setupComplete && users.length > 0,
    });
  } catch (error) {
    console.error('Setup check error:', error);
    return NextResponse.json({ complete: false }, { status: 500 });
  }
}
