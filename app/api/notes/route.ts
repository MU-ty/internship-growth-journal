import { env } from 'cloudflare:workers';
import { requireAccount, unauthorized } from '@/lib/account';

const MAX_TITLE = 120;
const MAX_CONTENT = 200_000;

function notePayload(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('笔记格式无效');
  const body = (value ?? {}) as Record<string, unknown>;
  if (typeof body.title !== 'string' || typeof body.content !== 'string')
    throw new Error('笔记标题和正文必须是文本');
  if (body.title.length > MAX_TITLE) throw new Error('标题不能超过 120 个字符');
  if (body.content.length > MAX_CONTENT)
    throw new Error('笔记内容过长，请拆分为多篇笔记后保存');
  const title = String(body.title ?? '')
    .trim()
    .slice(0, MAX_TITLE);
  const content = String(body.content ?? '').slice(0, MAX_CONTENT);
  return { title: title || '未命名笔记', content };
}

export async function GET() {
  const account = await requireAccount();
  if (!account) return unauthorized();
  const result = await env.DB.prepare(
    'SELECT * FROM quick_notes WHERE owner_key=? ORDER BY updated_at DESC, id DESC',
  )
    .bind(account.accountKey)
    .all();
  return Response.json(result.results);
}

export async function POST(request: Request) {
  const account = await requireAccount();
  if (!account) return unauthorized();
  let note: ReturnType<typeof notePayload>;
  try {
    note = notePayload(await request.json());
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : '笔记格式无效' },
      { status: 400 },
    );
  }
  const now = Date.now();
  const result = await env.DB.prepare(
    'INSERT INTO quick_notes (title,content,created_at,updated_at,owner_key) VALUES (?,?,?,?,?) RETURNING *',
  )
    .bind(note.title, note.content, now, now, account.accountKey)
    .first();
  return Response.json(result, { status: 201 });
}

export async function PUT(request: Request) {
  const account = await requireAccount();
  if (!account) return unauthorized();
  let body: Record<string, unknown>;
  let note: ReturnType<typeof notePayload>;
  try {
    body = (await request.json()) as Record<string, unknown>;
    note = notePayload(body);
    if (!Number.isSafeInteger(body.id) || Number(body.id) <= 0)
      throw new Error('无效的笔记编号');
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : '笔记格式无效' },
      { status: 400 },
    );
  }
  const result = await env.DB.prepare(
    'UPDATE quick_notes SET title=?,content=?,updated_at=? WHERE id=? AND owner_key=? RETURNING *',
  )
    .bind(
      note.title,
      note.content,
      Date.now(),
      Number(body.id),
      account.accountKey,
    )
    .first();
  if (!result) return Response.json({ error: '笔记不存在' }, { status: 404 });
  return Response.json(result);
}

export async function DELETE(request: Request) {
  const account = await requireAccount();
  if (!account) return unauthorized();
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: '无效的笔记编号' }, { status: 400 });
  }
  await env.DB.prepare('DELETE FROM quick_notes WHERE id=? AND owner_key=?')
    .bind(id, account.accountKey)
    .run();
  return new Response(null, { status: 204 });
}
