import { GrowthJournalV2 } from '@/components/growth-journal-v2';
import { requireAccount } from '@/lib/account';
import { isAdminAccount } from '@/lib/admin';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const account = await requireAccount();
  if (!account) redirect('/login');
  return <GrowthJournalV2 accountName={account.accountName} isAdmin={isAdminAccount(account)} />;
}
