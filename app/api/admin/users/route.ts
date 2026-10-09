import { requireAccount } from '@/lib/account';
import { isAdminAccount, readAdminUsers } from '@/lib/admin';

export async function GET(request: Request) {
  const account = await requireAccount();
  const headers = { 'Cache-Control': 'no-store', Vary: 'Cookie' };
  if (!account) return Response.json({ error: '请先登录' }, { status: 401, headers });
  if (!isAdminAccount(account)) return Response.json({ error: '此管理端仅限 mty 使用' }, { status: 403, headers });
  const url = new URL(request.url);
  const search = url.searchParams.get('q') ?? '';
  const rawPage = url.searchParams.get('page') ?? '1';
  if (search.length > 100 || !/^[1-9]\d{0,5}$/.test(rawPage)) {
    return Response.json({ error: '搜索或页码无效' }, { status: 400, headers });
  }
  try {
    return Response.json(await readAdminUsers(search, Number(rawPage)), { headers });
  } catch {
    console.error('Admin account overview unavailable');
    return Response.json({ error: '暂时无法读取账户信息，请稍后重试' }, { status: 503, headers });
  }
}
