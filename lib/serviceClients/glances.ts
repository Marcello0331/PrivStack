import { getSetting } from '../settings';

export async function getGlancesData() {
  const url = getSetting('glances_url') || process.env.GLANCES_URL || 'http://192.168.0.131:61208';

  try {
    const response = await fetch(`${url}/api/3/`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
