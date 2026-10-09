import { randomUUID } from 'node:crypto';
import { registrationStatus } from '@/lib/registration';
import {
  authDatabase,
  authResponse,
  safeAuthRequest,
  readAuthBody,
  normalizeUsername,
  validatePassword,
  hashPassword,
  credentialByUsername,
  consumeAttempts,
} from '@/lib/password-auth';

export async function GET() {
  try { return authResponse({ enabled: (await registrationStatus()).enabled }); }
  catch { return authResponse({ error: '暂时无法读取注册状态' }, 503); }
}

export async function POST(request: Request) {
  if (!safeAuthRequest(request))
    return authResponse({ error: '请求来源无效' }, 403);
  try {
    if (!(await registrationStatus()).enabled)
      return authResponse({ error: '注册已暂停，请稍后再来。已有账号仍可正常登录。', registrationPaused: true }, 403);
    const body = await readAuthBody(request);
    let username: string;
    try {
      username = normalizeUsername(body.username);
      validatePassword(body.password);
      if (body.password !== body.confirmPassword)
        throw new Error('两次输入的密码不一致');
    } catch (error) {
      return authResponse({ error: (error as Error).message }, 400);
    }
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    if (
      !(await consumeAttempts([{ key: `register:ip:${ip}`, limit: 8 }])) ||
      !(await consumeAttempts([{ key: 'register:total', limit: 50 }]))
    )
      return authResponse({ error: '注册请求过于频繁，请 15 分钟后再试' }, 429);
    if (username === 'mty' || (await credentialByUsername(username)))
      return authResponse({ error: '此账号名称不可用，请换一个账号' }, 409);
    // Every independently registered user receives a server-generated owner.
    // Never derive ownership from a submitted name, email, or account key.
    const ownerKey = `local:${randomUUID()}`;
    const created = await authDatabase()
      .prepare(`INSERT INTO login_credentials
      (owner_key,username,password_hash,version,account_name,updated_at,created_at)
      SELECT ?,?,?,?,?,?,? WHERE coalesce((SELECT enabled FROM registration_settings WHERE id=1),1)=1
      RETURNING owner_key`)
      .bind(
        ownerKey,
        username,
        await hashPassword(body.password as string),
        randomUUID(),
        username,
        Date.now(),
        Date.now(),
      )
      .first<{ owner_key: string }>();
    if (!created)
      return authResponse({ error: '注册已暂停，请稍后再来。已有账号仍可正常登录。', registrationPaused: true }, 403);
    // No cookie replacement: registering must not silently switch an already
    // signed-in owner into the new account.
    return authResponse({ ok: true, username }, 201);
  } catch (error) {
    if (error instanceof Error && /UNIQUE constraint/.test(error.message))
      return authResponse({ error: '此账号名称不可用，请换一个账号' }, 409);
    if (
      error instanceof SyntaxError ||
      (error instanceof Error && /登录信息/.test(error.message))
    )
      return authResponse({ error: '注册信息格式无效或过长' }, 400);
    console.error('Account registration unavailable');
    return authResponse({ error: '暂时无法注册，请稍后重试' }, 503);
  }
}
