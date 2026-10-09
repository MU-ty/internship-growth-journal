import { env } from 'cloudflare:workers';
import { requireAccount, unauthorized } from '@/lib/account';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
]);

async function ownerPrefix(accountKey: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(accountKey),
  );
  const hash = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 24);
  return `notes/${hash}/`;
}

export async function POST(request: Request) {
  const account = await requireAccount();
  if (!account) return unauthorized();
  const form = await request.formData();
  const file = form.get('image');
  if (!(file instanceof File)) {
    return Response.json({ error: '请选择图片' }, { status: 400 });
  }
  const extension = IMAGE_TYPES.get(file.type);
  if (!extension) {
    return Response.json(
      { error: '仅支持 JPG、PNG、WebP 或 GIF 图片' },
      { status: 415 },
    );
  }
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    return Response.json({ error: '图片大小需在 8MB 以内' }, { status: 413 });
  }
  const key = `${await ownerPrefix(account.accountKey)}${crypto.randomUUID()}.${extension}`;
  await env.BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { owner: account.accountKey },
  });
  return Response.json(
    { url: `/api/note-images?key=${encodeURIComponent(key)}` },
    { status: 201 },
  );
}

export async function GET(request: Request) {
  const account = await requireAccount();
  if (!account) return unauthorized();
  const key = new URL(request.url).searchParams.get('key') ?? '';
  const prefix = await ownerPrefix(account.accountKey);
  if (!key.startsWith(prefix)) {
    return Response.json({ error: '图片不存在' }, { status: 404 });
  }
  const object = await env.BUCKET.get(key);
  if (!object) return Response.json({ error: '图片不存在' }, { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'private, max-age=86400');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(object.body, { headers });
}
