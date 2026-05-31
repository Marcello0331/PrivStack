import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/config';
import { getSetting } from '@/lib/settings';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = getSetting('openweathermap_api_key') || process.env.OPENWEATHERMAP_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'not_configured' });
    }

    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=47.4979&lon=19.0402&units=metric&appid=${apiKey}`
      );
      const data = await response.json();

      return NextResponse.json({
        temp: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        humidity: data.main.humidity,
        condition: data.weather[0].main,
      });
    } catch {
      return NextResponse.json({ error: 'unreachable' });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
