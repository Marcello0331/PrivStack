import { hash, compare } from 'bcryptjs';
import getDb from './db';

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return compare(password, hash);
}

export function getUserByUsername(username: string) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  return stmt.get(username) as any;
}

export function createUser(username: string, passwordHash: string, role: string = 'viewer') {
  const db = getDb();
  const stmt = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
  const result = stmt.run(username, passwordHash, role);
  return result.lastInsertRowid;
}

export function getUserById(id: number) {
  const db = getDb();
  const stmt = db.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?');
  return stmt.get(id) as any;
}

export function getAllUsers() {
  const db = getDb();
  const stmt = db.prepare('SELECT id, username, role, created_at FROM users');
  return stmt.all() as any[];
}

export function updateUserPassword(userId: number, newPasswordHash: string) {
  const db = getDb();
  const stmt = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
  return stmt.run(newPasswordHash, userId);
}

export function deleteUser(userId: number) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM users WHERE id = ?');
  return stmt.run(userId);
}

export function changeUserRole(userId: number, newRole: string) {
  const db = getDb();
  const stmt = db.prepare('UPDATE users SET role = ? WHERE id = ?');
  return stmt.run(newRole, userId);
}
