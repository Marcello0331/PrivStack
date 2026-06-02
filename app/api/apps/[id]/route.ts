import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/config';
import { appPayloadSchema } from '@/lib/appValidation';

export const dynamic = 'force-dynamic';

async function updateApp(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = appPayloadSchema.parse(await request.json());
    const db = getDb();
    const stmt = db.prepare(
      'UPDATE apps SET name = ?, url = ?, icon_url = ?, description = ?, category = ?, open_in = ?, pinned = ? WHERE id = ?'
    );

    const result = stmt.run(
      body.name,
      body.url,
      body.icon_url || '',
      body.description || '',
      body.category || 'default',
      body.open_in,
      body.pinned ? 1 : 0,
      params.id
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update app error:', error);
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Invalid app data', details: (error as any).issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const PUT = updateApp;
export const PATCH = updateApp;

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const stmt = db.prepare('DELETE FROM apps WHERE id = ?');
    const result = stmt.run(params.id);
    if (result.changes === 0) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
