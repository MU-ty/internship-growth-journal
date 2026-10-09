import { env } from 'cloudflare:workers';
import { requireAccount, unauthorized } from '@/lib/account';

export async function GET() {
  const a = await requireAccount();
  if (!a) return unauthorized();
  const r = await env.DB.prepare(
    'SELECT * FROM internships WHERE owner_key=? ORDER BY created_at DESC',
  )
    .bind(a.accountKey)
    .all();
  return Response.json(r.results);
}
export async function POST(request: Request) {
  const a = await requireAccount();
  if (!a) return unauthorized();
  const b = (await request.json()) as Record<string, string>;
  if (!b.company?.trim() || !b.role?.trim() || !b.summary?.trim())
    return Response.json(
      { error: '请填写公司、岗位和核心收获' },
      { status: 400 },
    );
  const r = await env.DB.prepare(
    'INSERT INTO internships (company,role,period,summary,highlights,created_at,owner_key) VALUES (?,?,?,?,?,?,?) RETURNING *',
  )
    .bind(
      b.company.trim(),
      b.role.trim(),
      b.period?.trim() ?? '',
      b.summary.trim(),
      b.highlights?.trim() ?? '',
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
    'UPDATE internships SET company=?,role=?,period=?,summary=?,highlights=? WHERE id=? AND owner_key=? RETURNING *',
  )
    .bind(
      String(b.company).trim(),
      String(b.role).trim(),
      String(b.period ?? '').trim(),
      String(b.summary).trim(),
      String(b.highlights ?? '').trim(),
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
  await env.DB.prepare('DELETE FROM internships WHERE id=? AND owner_key=?')
    .bind(Number(id), a.accountKey)
    .run();
  return new Response(null, { status: 204 });
}
