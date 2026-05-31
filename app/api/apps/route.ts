import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/config';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pinned = searchParams.get('pinned');

    const db = getDb();
    let stmt;

    if (pinned === '1') {
      stmt = db.prepare('SELECT * FROM apps WHERE pinned = 1 ORDER BY sort_order ASC, created_at ASC');
    } else {
      stmt = db.prepare('SELECT * FROM apps ORDER BY sort_order ASC, created_at ASC');
    }

    const apps = stmt.all();
    return NextResponse.json(apps);
  } catch (error) {
    console.error('Get apps error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, url, icon_url, description, category, open_in, pinned } = body;

    const db = getDb();
    const stmt = db.prepare(
      'INSERT INTO apps (name, url, icon_url, description, category, open_in, pinned) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    const result = stmt.run(name, url, icon_url, description, category, open_in, pinned ? 1 : 0);

    return NextResponse.json({
      id: result.lastInsertRowid,
      name,
      url,
      icon_url,
      description,
      category,
      open_in,
      pinned,
    });
  } catch (error) {
    console.error('Create app error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
