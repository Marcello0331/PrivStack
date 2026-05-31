import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/config';
import getDb from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const stmt = db.prepare('SELECT layout_data FROM widget_layouts WHERE user_id = ?');
    const result = stmt.get(session.user?.id || '1') as { layout_data: string } | undefined;

    if (!result) {
      return NextResponse.json({ layout: [] });
    }

    return NextResponse.json({ layout: JSON.parse(result.layout_data) });
  } catch (error) {
    console.error('Get layout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const userId = session.user?.id || '1';

    const db = getDb();
    const stmt = db.prepare(
      'INSERT INTO widget_layouts (user_id, layout_data) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET layout_data = excluded.layout_data, updated_at = CURRENT_TIMESTAMP'
    );

    stmt.run(userId, JSON.stringify(body.layout));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save layout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
