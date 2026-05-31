import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, createUser, hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const users = getAllUsers();
    if (users.length > 0) {
      return NextResponse.json({ error: 'Admin account already exists' }, { status: 400 });
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    try {
      const passwordHash = await hashPassword(password);
      createUser(username, passwordHash, 'admin');
      return NextResponse.json({ success: true });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Failed to create user: ' + String(dbError) }, { status: 500 });
    }
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: 'Failed to parse request: ' + String(error) }, { status: 500 });
  }
}
