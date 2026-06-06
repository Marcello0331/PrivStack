import getDb from './db';

export interface ServiceConnection {
  id: number;
  type: string;
  name: string;
  url: string;
  api_key?: string | null;
  token?: string | null;
  extra_json?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceConnectionInput {
  type: string;
  name: string;
  url: string;
  api_key?: string;
  token?: string;
  extra_json?: string;
}

export function listServiceConnections(type?: string) {
  const db = getDb();
  const query = type
    ? 'SELECT id, type, name, url, api_key, token, extra_json, created_at, updated_at FROM service_connections WHERE type = ? ORDER BY name ASC'
    : 'SELECT id, type, name, url, api_key, token, extra_json, created_at, updated_at FROM service_connections ORDER BY type ASC, name ASC';
  const rows = type
    ? db.prepare(query).all(type)
    : db.prepare(query).all();

  return rows as ServiceConnection[];
}

export function getServiceConnection(id: number, type?: string) {
  const db = getDb();
  const row = type
    ? db.prepare('SELECT * FROM service_connections WHERE id = ? AND type = ?').get(id, type)
    : db.prepare('SELECT * FROM service_connections WHERE id = ?').get(id);

  return row as ServiceConnection | undefined;
}

export function createServiceConnection(input: ServiceConnectionInput) {
  const db = getDb();
  const stmt = db.prepare(
    'INSERT INTO service_connections (type, name, url, api_key, token, extra_json) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const result = stmt.run(
    input.type,
    input.name,
    input.url,
    input.api_key || null,
    input.token || null,
    input.extra_json || null
  );

  return getServiceConnection(Number(result.lastInsertRowid));
}

export function updateServiceConnection(id: number, input: ServiceConnectionInput) {
  const db = getDb();
  const stmt = db.prepare(
    `UPDATE service_connections
     SET type = ?, name = ?, url = ?, api_key = ?, token = ?, extra_json = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  );
  stmt.run(
    input.type,
    input.name,
    input.url,
    input.api_key || null,
    input.token || null,
    input.extra_json || null,
    id
  );

  return getServiceConnection(id);
}

export function deleteServiceConnection(id: number) {
  const db = getDb();
  return db.prepare('DELETE FROM service_connections WHERE id = ?').run(id);
}

export function maskServiceConnection(connection: ServiceConnection) {
  return {
    id: connection.id,
    type: connection.type,
    name: connection.name,
    url: connection.url,
    hasApiKey: Boolean(connection.api_key),
    hasToken: Boolean(connection.token),
    hasExtraConfig: Boolean(connection.extra_json),
    created_at: connection.created_at,
    updated_at: connection.updated_at,
  };
}
