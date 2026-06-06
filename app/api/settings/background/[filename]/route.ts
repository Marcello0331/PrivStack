import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CONTENT_TYPES: Record<string, string> = {
  gif: 'image/gif',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

function getBackgroundDir() {
  const dbPath = process.env.DATABASE_PATH || '/data/privstack.db';
  return path.join(process.env.PRIVSTACK_DATA_DIR || path.dirname(dbPath), 'backgrounds');
}

export async function GET(_request: NextRequest, { params }: { params: { filename: string } }) {
  const filename = params.filename;

  if (!/^[0-9]+-[0-9a-f-]+\.(gif|jpg|png|webp)$/i.test(filename)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const extension = filename.split('.').pop()?.toLowerCase() || '';

  try {
    const file = await fs.readFile(path.join(getBackgroundDir(), filename));

    return new NextResponse(file, {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Type': CONTENT_TYPES[extension] || 'application/octet-stream',
      },
    });
  } catch {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
}
