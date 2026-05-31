import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'URL required' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });
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
