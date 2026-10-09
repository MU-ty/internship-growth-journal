import { env } from 'cloudflare:workers';
import { requireAccount, unauthorized } from '@/lib/account';

function payload(value: unknown, partial = false) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('面经格式无效');
  const body = value as Record<string, unknown>;
  const record: Record<string, string> = {};
  for (const [key, limit] of [
    ['title', 200],
    ['company', 160],
    ['role', 160],
    ['round', 80],
    ['interview_date', 10],
    ['source_url', 2000],
    ['content', 100_000],
  ] as const) {
    if (partial && body[key] === undefined) continue;
    const text = body[key] ?? '';
    if (typeof text !== 'string' || text.length > limit)
      throw new Error('面经内容格式无效或过长');
    record[key] = key === 'content' ? text : text.trim();
  }
  if (record.title !== undefined && !record.title)
    throw new Error('请填写面经标题');
  if (record.content !== undefined && !record.content.trim())
    throw new Error('请填写面经正文');
  if (record.source_url) {
    let url: URL;
    try {
      url = new URL(record.source_url);
    } catch {
      throw new Error('请输入完整的来源链接');
    }
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new Error('来源链接只能使用 http 或 https');
  }
  if (record.interview_date) {
    const date = record.interview_date;
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date
    )
      throw new Error('面试日期无效');
  }
  if (partial && !Object.keys(record).length)
    throw new Error('没有需要更新的内容');
  return record;
}
function invalid(error: unknown) {
  return Response.json(
    { error: error instanceof Error ? error.message : '面经格式无效' },
    { status: 400 },
  );
}
export async function GET() {
  const account = await requireAccount();
  if (!account) return unauthorized();
  const rows = await env.DB.prepare(
    'SELECT * FROM interview_experiences WHERE owner_key=? ORDER BY updated_at DESC,id DESC',
  )
    .bind(account.accountKey)
    .all();
  return Response.json(rows.results);
}
export async function POST(request: Request) {
  const account = await requireAccount();
  if (!account) return unauthorized();
  let record: Record<string, string>;
  try {
    record = payload(await request.json());
  } catch (error) {
    return invalid(error);
  }
  const now = Date.now();
  const row = await env.DB.prepare(
    `INSERT INTO interview_experiences (title,company,role,round,interview_date,source_url,content,created_at,updated_at,owner_key) VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING *`,
  )
    .bind(
      record.title,
      record.company,
      record.role,
      record.round,
      record.interview_date,
      record.source_url,
      record.content,
      now,
      now,
      account.accountKey,
    )
    .first();
  return Response.json(row, { status: 201 });
}
export async function PUT(request: Request) {
  const account = await requireAccount();
  if (!account) return unauthorized();
  let record: Record<string, string>;
  let id: number;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    record = payload(body, true);
    if (!Number.isSafeInteger(body.id) || Number(body.id) <= 0)
      throw new Error('面经编号无效');
    id = Number(body.id);
  } catch (error) {
    return invalid(error);
  }
  const row = await env.DB.prepare(
    `UPDATE interview_experiences SET title=COALESCE(?,title),company=COALESCE(?,company),role=COALESCE(?,role),round=COALESCE(?,round),interview_date=COALESCE(?,interview_date),source_url=COALESCE(?,source_url),content=COALESCE(?,content),updated_at=? WHERE id=? AND owner_key=? RETURNING *`,
  )
    .bind(
      record.title ?? null,
      record.company ?? null,
      record.role ?? null,
      record.round ?? null,
      record.interview_date ?? null,
      record.source_url ?? null,
      record.content ?? null,
      Date.now(),
      id,
      account.accountKey,
    )
    .first();
  if (!row) return Response.json({ error: '面经不存在' }, { status: 404 });
  return Response.json(row);
}
export async function DELETE(request: Request) {
  const account = await requireAccount();
  if (!account) return unauthorized();
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isSafeInteger(id) || id <= 0)
    return invalid(new Error('面经编号无效'));
  const row = await env.DB.prepare(
    'DELETE FROM interview_experiences WHERE id=? AND owner_key=? RETURNING id',
  )
    .bind(id, account.accountKey)
    .first();
  if (!row) return Response.json({ error: '面经不存在' }, { status: 404 });
  return new Response(null, { status: 204 });
}
