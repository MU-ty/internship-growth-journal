import { randomUUID } from 'node:crypto';
import { requireAccount, platformAccount } from '@/lib/account';
import {
  authResponse,
  safeAuthRequest,
  readAuthBody,
  normalizeUsername,
  validatePassword,
  hashPassword,
  verifyPassword,
  credentialFor,
  createSession,
  authDatabase,
  consumeAttempts,
} from '@/lib/password-auth';

export async function POST(request: Request) {
  if (!safeAuthRequest(request))
    return authResponse({ error: '请求来源无效' }, 403);
  try {
    const account = await requireAccount();
    if (!account) return authResponse({ error: '请先登录' }, 401);
    if (
      !(await consumeAttempts([
        { key: `password:owner:${account.accountKey}`, limit: 8 },
      ]))
    )
      return authResponse({ error: '尝试次数过多，请 15 分钟后再试' }, 429);
    const existing = await credentialFor(account.accountKey);
    const body = await readAuthBody(request);
    const username = normalizeUsername(body.username);
    if (username === 'mty' && account.accountKey !== 'mty')
      return authResponse({ error: '此账号名称不可用' }, 409);
    if (existing && username !== existing.username)
      return authResponse({ error: '已绑定的登录账号不能修改' }, 400);
    // Recovery is permitted only for the same platform-proven account.
    const platform = await platformAccount();
    const trustedRecovery = platform?.accountKey === account.accountKey;
    if (!existing && !trustedRecovery)
      return authResponse(
        { error: '首次绑定请使用原来的 OpenAI 账号登录' },
        403,
      );
    if (existing && !trustedRecovery) {
      if (
        typeof body.currentPassword !== 'string' ||
        body.currentPassword.length > 128 ||
        !(await verifyPassword(body.currentPassword, existing.password_hash))
      )
        return authResponse({ error: '当前密码不正确' }, 401);
    }
    try {
      validatePassword(body.password);
    } catch (error) {
      return authResponse({ error: (error as Error).message }, 400);
    }
    const credential = {
      owner_key: account.accountKey,
      username,
      password_hash: await hashPassword(body.password),
      version: randomUUID(),
      account_name: account.accountName,
    };
    const results = await authDatabase().batch([
      authDatabase()
        .prepare(`INSERT INTO login_credentials
        (owner_key,username,password_hash,version,account_name,updated_at) VALUES (?,?,?,?,?,?)
        ON CONFLICT(owner_key) DO UPDATE SET password_hash=excluded.password_hash,
          version=excluded.version,updated_at=excluded.updated_at
          WHERE login_credentials.version=? RETURNING owner_key`)
        .bind(
          credential.owner_key,
          username,
          credential.password_hash,
          credential.version,
          credential.account_name,
          Date.now(),
          existing?.version ?? '',
        ),
      authDatabase()
        .prepare(`DELETE FROM login_sessions WHERE owner_key=?
        AND credential_version<>(SELECT version FROM login_credentials WHERE owner_key=?)`)
        .bind(account.accountKey, account.accountKey),
    ]);
    if (!results[0].results.length)
      return authResponse({ error: '密码设置已变化，请刷新后重试' }, 409);
    return authResponse(
      { ok: true, username },
      200,
      await createSession(credential),
    );
  } catch (error) {
    if (error instanceof Error && /UNIQUE constraint/.test(error.message))
      return authResponse({ error: '此账号名称已被使用' }, 409);
    if (
      error instanceof SyntaxError ||
      (error instanceof Error && /账号需|请输入|登录信息/.test(error.message))
    )
      return authResponse({ error: '请检查账号和密码格式' }, 400);
    console.error('Password settings unavailable');
    return authResponse({ error: '暂时无法保存密码，请稍后重试' }, 503);
  }
}
