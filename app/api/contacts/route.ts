import { env } from 'cloudflare:workers';
import { requireAccount, unauthorized } from '@/lib/account';

export async function GET() {
  const a = await requireAccount();
  if (!a) return unauthorized();
  const r = await env.DB.prepare(
    'SELECT * FROM contacts WHERE owner_key=? ORDER BY created_at ASC',
  )
    .bind(a.accountKey)
    .all();
  return Response.json(r.results);
}
export async function POST(request: Request) {
  const a = await requireAccount();
  if (!a) return unauthorized();
  const b = (await request.json()) as Record<string, string | number>;
  if (
    !String(b.name ?? '').trim() ||
    !String(b.relationship ?? '').trim() ||
    !String(b.value ?? '').trim() ||
    !String(b.direction ?? '').trim()
  )
    return Response.json({ error: '请完整填写人脉信息' }, { status: 400 });
  const r = await env.DB.prepare(
    'INSERT INTO contacts (name,relationship,value,direction,closeness,created_at,owner_key) VALUES (?,?,?,?,?,?,?) RETURNING *',
  )
    .bind(
      String(b.name).trim(),
      String(b.relationship).trim(),
      String(b.value).trim(),
      String(b.direction).trim(),
      Number(b.closeness ?? 2),
      Date.now(),
      a.accountKey,
    )
    .first();
  return Response.json(r, { status: 201 });
}
export async function PUT(request: Request) {
  const a = await requireAccount();
  if (!a) return unauthorized();
  const b = (await request.json()) as Record<string, string | number>;
  const r = await env.DB.prepare(
    'UPDATE contacts SET name=?,relationship=?,value=?,direction=?,closeness=? WHERE id=? AND owner_key=? RETURNING *',
  )
    .bind(
      String(b.name).trim(),
      String(b.relationship).trim(),
      String(b.value).trim(),
      String(b.direction).trim(),
      Number(b.closeness ?? 2),
      Number(b.id),
      a.accountKey,
    )
    .first();
  return Response.json(r);
}
export async function DELETE(request: Request) {
  const a = await requireAccount();
  if (!a) return unauthorized();
  const id = new URL(request.url).searchParams.get('id');
  await env.DB.prepare('DELETE FROM contacts WHERE id=? AND owner_key=?')
    .bind(Number(id), a.accountKey)
    .run();
  return new Response(null, { status: 204 });
}
