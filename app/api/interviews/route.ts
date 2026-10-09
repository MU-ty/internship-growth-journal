import { env } from 'cloudflare:workers';
import { requireAccount, unauthorized } from '@/lib/account';
import { INTERVIEW_STATUSES } from '@/lib/interviews';

function payload(value: unknown, partial = false) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('记录格式无效');
  const body = value as Record<string, unknown>;
  const result: Record<string, string> = {};
  for (const [key, limit] of [
    ['company', 160],
    ['role', 160],
    ['status', 30],
    ['interview_date', 10],
    ['notes', 20_000],
  ] as const) {
    if (body[key] === undefined && partial) continue;
    const text = body[key] ?? (key === 'status' ? '已投递' : '');
    if (typeof text !== 'string' || text.length > limit)
      throw new Error('记录内容格式无效或过长');
    result[key] = text.trim();
  }
  if (result.company !== undefined && !result.company)
    throw new Error('请填写公司名称');
  if (
    result.status !== undefined &&
    !INTERVIEW_STATUSES.includes(
      result.status as (typeof INTERVIEW_STATUSES)[number],
    )
  )
    throw new Error('请选择有效的面试状态');
  if (result.interview_date) {
    const date = result.interview_date;
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date
    )
      throw new Error('面试日期无效');
  }
  if (partial && !Object.keys(result).length)
    throw new Error('没有需要更新的内容');
  return result;
}
function invalid(error: unknown) {
  return Response.json(
    { error: error instanceof Error ? error.message : '记录格式无效' },
    { status: 400 },
  );
}
export async function GET() {
  const account = await requireAccount();
  if (!account) return unauthorized();
  const result = await env.DB.prepare(
    'SELECT * FROM interviews WHERE owner_key=? ORDER BY updated_at DESC,id DESC',
  )
    .bind(account.accountKey)
    .all();
  return Response.json(result.results);
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
  const result = await env.DB.prepare(
    'INSERT INTO interviews (company,role,status,interview_date,notes,created_at,updated_at,owner_key) VALUES (?,?,?,?,?,?,?,?) RETURNING *',
  )
    .bind(
      record.company,
      record.role,
      record.status,
      record.interview_date,
      record.notes,
      now,
      now,
      account.accountKey,
    )
    .first();
  return Response.json(result, { status: 201 });
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
      throw new Error('记录编号无效');
    id = Number(body.id);
  } catch (error) {
    return invalid(error);
  }
  const result = await env.DB.prepare(
    'UPDATE interviews SET company=COALESCE(?,company),role=COALESCE(?,role),status=COALESCE(?,status),interview_date=COALESCE(?,interview_date),notes=COALESCE(?,notes),updated_at=? WHERE id=? AND owner_key=? RETURNING *',
  )
    .bind(
      record.company ?? null,
      record.role ?? null,
      record.status ?? null,
      record.interview_date ?? null,
      record.notes ?? null,
      Date.now(),
      id,
      account.accountKey,
    )
    .first();
  if (!result)
    return Response.json({ error: '面试记录不存在' }, { status: 404 });
  return Response.json(result);
}
export async function DELETE(request: Request) {
  const account = await requireAccount();
  if (!account) return unauthorized();
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isSafeInteger(id) || id <= 0)
    return invalid(new Error('记录编号无效'));
  const result = await env.DB.prepare(
    'DELETE FROM interviews WHERE id=? AND owner_key=? RETURNING id',
  )
    .bind(id, account.accountKey)
    .first();
  if (!result)
    return Response.json({ error: '面试记录不存在' }, { status: 404 });
  return new Response(null, { status: 204 });
}
