import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { authOptions } from '../../auth/config';
import { setSetting } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function isAdmin(session: any) {
  return session?.user?.role === 'admin';
}

function getBackgroundDir() {
  const dbPath = process.env.DATABASE_PATH || '/data/privstack.db';
  return path.join(process.env.PRIVSTACK_DATA_DIR || path.dirname(dbPath), 'backgrounds');
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'missing_file' }, { status: 400 });
    }

    if (!ALLOWED_TYPES[file.type]) {
      return NextResponse.json({ error: 'unsupported_type' }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'file_too_large' }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}-${randomUUID()}.${ALLOWED_TYPES[file.type]}`;
    const backgroundDir = getBackgroundDir();

    await fs.mkdir(backgroundDir, { recursive: true });
    await fs.writeFile(path.join(backgroundDir, filename), bytes);

    const url = `/api/settings/background/${filename}`;
    setSetting('background_type', 'image');
    setSetting('background_value', url);

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Background upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
