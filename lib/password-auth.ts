import { env } from 'cloudflare:workers';
import { cookies } from 'next/headers';
import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';

export const SESSION_COOKIE = '__Host-journal-session';
const SESSION_SECONDS = 7 * 24 * 60 * 60;
type Credential = {
  owner_key: string;
  username: string;
  password_hash: string;
  version: string;
  account_name: string;
};
export function authDatabase() {
  return env.DB;
}
export function normalizeUsername(value: unknown) {
  if (typeof value !== 'string') throw new Error('请输入账号');
  const username = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{2,31}$/.test(username))
    throw new Error('账号需为 3–32 位字母、数字、下划线或短横线');
  return username;
}
export function validatePassword(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128)
    throw new Error('密码需为 12–128 个字符，可以使用较长的短语');
}
function derive(password: string, salt: string) {
  // OWASP scrypt profile: N=2^15, r=8, p=3 (32 MiB working memory).
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      32,
      { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt-v1$${salt}$${(await derive(password, salt)).toString('hex')}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const parts = encoded.split('$');
  if (
    parts.length !== 3 ||
    parts[0] !== 'scrypt-v1' ||
    !/^[a-f0-9]{32}$/.test(parts[1]) ||
    !/^[a-f0-9]{64}$/.test(parts[2])
  )
    return false;
  return timingSafeEqual(
    await derive(password, parts[1]),
    Buffer.from(parts[2], 'hex'),
  );
}
export function digest(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
export async function credentialFor(ownerKey: string) {
  return authDatabase()
    .prepare('SELECT * FROM login_credentials WHERE owner_key=?')
    .bind(ownerKey)
    .first<Credential>();
}
export async function credentialByUsername(username: string) {
  return authDatabase()
    .prepare('SELECT * FROM login_credentials WHERE username=?')
    .bind(username)
    .first<Credential>();
}
export async function passwordAccount() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const row = await authDatabase()
    .prepare(`SELECT c.owner_key,c.account_name,c.username
    FROM login_sessions s JOIN login_credentials c
    ON s.owner_key=c.owner_key AND s.credential_version=c.version
    WHERE s.token_hash=? AND s.expires_at>?`)
    .bind(digest(token), Date.now())
    .first<{ owner_key: string; account_name: string; username: string }>();
  if (!row) return null;
  return {
    accountKey: row.owner_key,
    accountName: row.account_name,
    authMethod: 'password' as const,
  };
}
export async function createSession(credential: Credential) {
  const token = randomBytes(32).toString('hex');
  const now = Date.now();
  await authDatabase().batch([
    authDatabase()
      .prepare('DELETE FROM login_sessions WHERE expires_at<=?')
      .bind(now),
    authDatabase()
      .prepare(
        'INSERT INTO login_sessions (token_hash,owner_key,credential_version,expires_at) VALUES (?,?,?,?)',
      )
      .bind(
        digest(token),
        credential.owner_key,
        credential.version,
        now + SESSION_SECONDS * 1000,
      ),
  ]);
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_SECONDS}`;
}
export async function revokeSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token && /^[a-f0-9]{64}$/.test(token))
    await authDatabase()
      .prepare('DELETE FROM login_sessions WHERE token_hash=?')
      .bind(digest(token))
      .run();
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
export function authResponse(body: unknown, status = 200, cookie?: string) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...(cookie ? { 'Set-Cookie': cookie } : {}),
    },
  });
}
export function safeAuthRequest(request: Request) {
  return (
    request.headers.get('origin') === new URL(request.url).origin &&
    request.headers.get('content-type')?.split(';')[0].trim() ===
      'application/json'
  );
}
export async function readAuthBody(
  request: Request,
): Promise<Record<string, unknown>> {
  // Bound actual bytes too, not only a client-provided Content-Length.
  const reader = request.body?.getReader();
  if (!reader) throw new Error('请填写登录信息');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 4096) {
      await reader.cancel();
      throw new Error('登录信息过长');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const body = JSON.parse(new TextDecoder().decode(bytes));
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new Error('登录信息格式无效');
  return body;
}
export async function consumeAttempts(keys: { key: string; limit: number }[]) {
  const now = Date.now(),
    until = now + 15 * 60 * 1000;
  await authDatabase()
    .prepare('DELETE FROM login_attempts WHERE expires_at<=?')
    .bind(now)
    .run();
  const rows = await authDatabase().batch(
    keys.map(({ key }) =>
      authDatabase()
        .prepare(`
    INSERT INTO login_attempts (bucket_key,hits,expires_at) VALUES (?,1,?)
    ON CONFLICT(bucket_key) DO UPDATE SET
      hits=CASE WHEN expires_at<=? THEN 1 ELSE hits+1 END,
      expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END
    RETURNING hits`)
        .bind(digest(key), until, now, now),
    ),
  );
  return rows.every(
    (row, i) =>
      Number((row.results[0] as { hits: number }).hits) <= keys[i].limit,
  );
}
