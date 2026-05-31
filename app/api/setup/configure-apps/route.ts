import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { apps } = await request.json();

    if (!Array.isArray(apps)) {
      return NextResponse.json({ error: 'Apps must be an array' }, { status: 400 });
    }

    const db = getDb();
    const insertApp = db.prepare(
      'INSERT INTO apps (name, url, icon_url, category, pinned) VALUES (?, ?, ?, ?, ?)'
    );

    for (const app of apps) {
      insertApp.run(app.name, app.url, app.icon_url, app.category || 'default', app.pinned ? 1 : 0);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Configure apps error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
