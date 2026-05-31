import getDb from './db';

export function getSetting(key: string, defaultValue: string | null = null): string | null {
  const db = getDb();
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const result = stmt.get(key) as { value: string } | undefined;
  return result?.value || defaultValue;
}

export function setSetting(key: string, value: string) {
  const db = getDb();
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  return stmt.run(key, value);
}

export function getAllSettings() {
  const db = getDb();
  const stmt = db.prepare('SELECT key, value FROM settings');
  const settings = stmt.all() as Array<{ key: string; value: string }>;

  const result: Record<string, string> = {};
  for (const setting of settings) {
    result[setting.key] = setting.value;
  }
  return result;
}

export function isSetupComplete(): boolean {
  return getSetting('setup_complete') === '1';
}

export function markSetupComplete() {
  setSetting('setup_complete', '1');
}
