import {
  authResponse,
  safeAuthRequest,
  revokeSession,
} from '@/lib/password-auth';

export async function POST(request: Request) {
  if (!safeAuthRequest(request))
    return authResponse({ error: '请求来源无效' }, 403);
  try {
    return authResponse({ ok: true }, 200, await revokeSession());
  } catch {
    return authResponse({ error: '退出失败，请重试' }, 503);
  }
}
