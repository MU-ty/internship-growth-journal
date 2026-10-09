import {
  authResponse,
  safeAuthRequest,
  readAuthBody,
  normalizeUsername,
  credentialByUsername,
  verifyPassword,
  createSession,
  consumeAttempts,
  authDatabase,
} from '@/lib/password-auth';

export async function POST(request: Request) {
  if (!safeAuthRequest(request))
    return authResponse({ error: '请求来源无效' }, 403);
  try {
    const body = await readAuthBody(request);
    const username = normalizeUsername(body.username);
    if (
      typeof body.password !== 'string' ||
      !body.password ||
      body.password.length > 128
    )
      return authResponse({ error: '账号或密码不正确' }, 401);
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    if (
      !(await consumeAttempts([{ key: `login:ip:${ip}`, limit: 30 }])) ||
      !(await consumeAttempts([{ key: `login:user:${username}`, limit: 8 }]))
    )
      return authResponse(
        { error: '尝试次数过多，请 15 分钟后再试，或使用 OpenAI 登录' },
        429,
      );
    const credential = await credentialByUsername(username);
    // Same KDF cost for unknown usernames, without revealing account existence.
    const dummy =
      'scrypt-v1$00000000000000000000000000000000$' + '00'.repeat(32);
    const valid = await verifyPassword(
      body.password,
      credential?.password_hash ?? dummy,
    );
    if (!credential || !valid)
      return authResponse({ error: '账号或密码不正确' }, 401);
    const cookie = await createSession(credential);
    await authDatabase()
      .prepare('UPDATE login_credentials SET last_login_at=? WHERE owner_key=?')
      .bind(Date.now(), credential.owner_key)
      .run();
    return authResponse({ ok: true }, 200, cookie);
  } catch (error) {
    if (error instanceof SyntaxError)
      return authResponse({ error: '登录信息格式无效' }, 400);
    if (error instanceof Error && /账号需|请输入|登录信息/.test(error.message))
      return authResponse({ error: error.message }, 400);
    console.error('Password login unavailable');
    return authResponse(
      { error: '暂时无法登录，请稍后重试或使用 OpenAI 登录' },
      503,
    );
  }
}
