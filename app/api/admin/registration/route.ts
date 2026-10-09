import { requireAccount } from '@/lib/account';
import { isAdminAccount } from '@/lib/admin';
import { safeAuthRequest, readAuthBody, authResponse } from '@/lib/password-auth';
import { registrationStatus, setRegistrationEnabled } from '@/lib/registration';

async function authorize() {
  const account = await requireAccount();
  if (!account) return authResponse({ error: '请先登录' }, 401);
  if (!isAdminAccount(account)) return authResponse({ error: '此功能仅限 mty 使用' }, 403);
}
export async function GET() {
  const denied = await authorize();
  if (denied) return denied;
  try { return authResponse(await registrationStatus()); }
  catch { return authResponse({ error: '无法读取注册状态，请重试' }, 503); }
}
export async function PUT(request: Request) {
  if (!safeAuthRequest(request)) return authResponse({ error: '请求来源无效' }, 403);
  const denied = await authorize();
  if (denied) return denied;
  try {
    const body = await readAuthBody(request);
    if (typeof body.enabled !== 'boolean') return authResponse({ error: '注册状态无效' }, 400);
    return authResponse(await setRegistrationEnabled(body.enabled));
  } catch (error) {
    if (error instanceof SyntaxError || (error instanceof Error && /登录信息/.test(error.message)))
      return authResponse({ error: '请求格式无效' }, 400);
    return authResponse({ error: '无法保存注册状态，请重试' }, 503);
  }
}
