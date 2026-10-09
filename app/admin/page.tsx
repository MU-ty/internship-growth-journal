import { requireAccount } from '@/lib/account';
import { isAdminAccount } from '@/lib/admin';
import { AdminDashboard } from '@/components/admin-dashboard';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export default async function AdminPage() {
  const account = await requireAccount();
  if (!account) redirect('/login');
  if (!isAdminAccount(account)) {
    return <main className="auth-shell"><section className="auth-card">
      <h1>无法访问管理端</h1><p>此页面仅限 mty 管理员账户使用。</p>
      <a href="/">返回收获簿</a>
    </section></main>;
  }
  return <AdminDashboard />;
}
