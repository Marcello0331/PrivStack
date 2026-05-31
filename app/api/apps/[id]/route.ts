import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/config';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const db = getDb();
    const stmt = db.prepare(
      'UPDATE apps SET name = ?, url = ?, icon_url = ?, description = ?, category = ?, open_in = ?, pinned = ? WHERE id = ?'
    );

    stmt.run(body.name, body.url, body.icon_url, body.description, body.category, body.open_in, body.pinned ? 1 : 0, params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const stmt = db.prepare('DELETE FROM apps WHERE id = ?');
    stmt.run(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
