import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, createUser, hashPassword } from '@/lib/auth';

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

    const passwordHash = await hashPassword(password);
    createUser(username, passwordHash, 'admin');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
