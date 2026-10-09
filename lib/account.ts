import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { headers } from 'next/headers';
import { passwordAccount } from '@/lib/password-auth';

type RuntimeEnv = { MTY_OWNER_EMAIL?: string };

export async function platformAccount() {
  const user = await getChatGPTUser();
  if (!user) return null;
  const ownerEmail = (
    env as unknown as RuntimeEnv
  ).MTY_OWNER_EMAIL?.toLowerCase();
  const isMty = Boolean(ownerEmail && user.email.toLowerCase() === ownerEmail);
  return {
    ...user,
    accountKey: isMty ? 'mty' : `user:${user.userId}`,
    accountName: isMty ? 'mty' : user.fullName || user.email.split('@')[0],
    authMethod: 'openai' as const,
  };
}

export async function requireAccount() {
  // Reject cross-site browser requests before granting either identity type.
  const requestHeaders = await headers();
  if (
    requestHeaders.get('sec-fetch-site') === 'cross-site' &&
    (requestHeaders.get('sec-fetch-mode') !== 'navigate' ||
      requestHeaders.get('sec-fetch-dest') !== 'document' ||
      requestHeaders.has('content-type'))
  )
    return null;
  return (await passwordAccount()) ?? (await platformAccount());
}

export function unauthorized() {
  return Response.json({ error: '请先登录后继续' }, { status: 401 });
}
