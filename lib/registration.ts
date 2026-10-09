import { env } from 'cloudflare:workers';

export async function registrationStatus() {
  const row = await env.DB.prepare('SELECT enabled,updated_at FROM registration_settings WHERE id=1')
    .first<{ enabled: number; updated_at: number | null }>();
  return { enabled: row ? row.enabled === 1 : true, updatedAt: row?.updated_at ?? null };
}

export async function setRegistrationEnabled(enabled: boolean) {
  const row = await env.DB.prepare(`INSERT INTO registration_settings(id,enabled,updated_at) VALUES(1,?,?)
    ON CONFLICT(id) DO UPDATE SET enabled=excluded.enabled,updated_at=excluded.updated_at
    RETURNING enabled,updated_at`).bind(enabled ? 1 : 0, Date.now())
    .first<{ enabled: number; updated_at: number }>();
  if (!row) throw new Error('Registration setting not saved');
  return { enabled: row.enabled === 1, updatedAt: row.updated_at };
}
