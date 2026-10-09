import { PasswordSettings } from '@/components/account-auth';
import { requireAccount, platformAccount } from '@/lib/account';
import { credentialFor } from '@/lib/password-auth';
import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default async function AccountPage() {
  const account = await requireAccount();
  if (!account) redirect('/login');
  try {
    const credential = await credentialFor(account.accountKey);
    const platform = await platformAccount();
    return (
      <PasswordSettings
        accountName={account.accountName}
        username={
          credential?.username ?? (account.accountKey === 'mty' ? 'mty' : '')
        }
        configured={!!credential}
        canRecoverWithOpenAI={!account.accountKey.startsWith('local:')}
        needsCurrentPassword={
          !!credential && platform?.accountKey !== account.accountKey
        }
      />
    );
  } catch {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <h1>暂时无法读取账号设置</h1>
          <p>你的原有记录不受影响，请稍后刷新重试。</p>
          <a href="/">返回收获簿</a>
        </section>
      </main>
    );
  }
}
