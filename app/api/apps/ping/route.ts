import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'URL required' }, { status: 400 });
    }

    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return NextResponse.json({ online: false, error: 'Unsupported protocol' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ online: false, error: 'Invalid URL' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      let response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });
      if (response.status === 405) {
        response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
        });
      }
      clearTimeout(timeoutId);
      return NextResponse.json({ online: response.ok });
    } catch {
      clearTimeout(timeoutId);
      return NextResponse.json({ online: false });
    }
  } catch (error) {
    return NextResponse.json({ online: false }, { status: 500 });
  }
}
