import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { appPayloadSchema } from '@/lib/appValidation';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { apps } = await request.json();

    if (!Array.isArray(apps)) {
      return NextResponse.json({ error: 'Apps must be an array' }, { status: 400 });
    }

    const parsedApps = apps.map((app) => appPayloadSchema.parse({
      open_in: 'tab',
      description: '',
      ...app,
      pinned: Boolean(app.pinned),
    }));

    const db = getDb();
    const insertApp = db.prepare(
      'INSERT INTO apps (name, url, icon_url, description, category, open_in, pinned) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    for (const app of parsedApps) {
      insertApp.run(app.name, app.url, app.icon_url || '', app.description || '', app.category || 'default', app.open_in, app.pinned ? 1 : 0);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Configure apps error:', error);
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Invalid app data', details: (error as any).issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
