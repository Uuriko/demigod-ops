/** SQLite Role Mission store. JSON files stay import, not the write path. */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export function missionStorePath(busy, root) {
  if (process.env.DEMIGOD_DIE_STORE) return process.env.DEMIGOD_DIE_STORE;
  const base = busy || process.env.DEMIGOD_BUSY || '/tmp/dg-busy';
  return path.join(base, 'die-missions.sqlite');
}

export function openMissionStore(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    CREATE TABLE IF NOT EXISTS missions (
      role_id TEXT PRIMARY KEY,
      json TEXT NOT NULL,
      version INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      role_id TEXT NOT NULL,
      action TEXT NOT NULL,
      at TEXT NOT NULL,
      idempotency_key TEXT,
      json TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS audit_idem ON audit_events(idempotency_key) WHERE idempotency_key IS NOT NULL;
  `);
  const getStmt = db.prepare('SELECT json FROM missions WHERE role_id = ?');
  const putStmt = db.prepare(`
    INSERT INTO missions(role_id, json, version, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(role_id) DO UPDATE SET json = excluded.json, version = excluded.version, updated_at = excluded.updated_at
  `);
  const listStmt = db.prepare('SELECT json FROM missions ORDER BY updated_at DESC');
  const auditStmt = db.prepare(`
    INSERT INTO audit_events(id, role_id, action, at, idempotency_key, json)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const seenStmt = db.prepare('SELECT id FROM audit_events WHERE idempotency_key = ?');

  return {
    file,
    get(roleId) {
      const row = getStmt.get(roleId);
      return row ? JSON.parse(row.json) : null;
    },
    put(mission) {
      putStmt.run(mission.roleId, JSON.stringify(mission), mission.version || 1, mission.updatedAt || new Date().toISOString());
      return mission;
    },
    list() {
      return listStmt.all().map((row) => JSON.parse(row.json));
    },
    seen(idempotencyKey) {
      if (!idempotencyKey) return false;
      return Boolean(seenStmt.get(idempotencyKey));
    },
    audit(event) {
      try {
        auditStmt.run(event.id, event.roleId, event.action, event.at, event.idempotencyKey || null, JSON.stringify(event));
      } catch (error) {
        if (String(error.message || error).includes('UNIQUE')) return false;
        throw error;
      }
      return true;
    },
    close() {
      db.close();
    },
  };
}

export function importJsonMissions(store, jsonPath) {
  if (!fs.existsSync(jsonPath)) return 0;
  const doc = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const missions = doc?.missions && typeof doc.missions === 'object' ? Object.values(doc.missions) : [];
  let n = 0;
  for (const mission of missions) {
    if (mission?.roleId) {
      store.put(mission);
      n += 1;
    }
  }
  return n;
}
