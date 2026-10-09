import { env } from 'cloudflare:workers';
import { HOT100 } from '@/lib/hot100';
import { requireAccount, unauthorized } from '@/lib/account';

async function seed(owner: string) {
  const row = await env.DB.prepare(
    'SELECT COUNT(*) AS count FROM leetcode_problems WHERE owner_key=?',
  )
    .bind(owner)
    .first<{ count: number }>();
  if (!row?.count) {
    const now = Date.now();
    await env.DB.batch(
      HOT100.map((p, i) =>
        env.DB.prepare(
          'INSERT INTO leetcode_problems (order_no,title,category,difficulty,status,confidence,notes,language,code,updated_at,owner_key) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        ).bind(
          i + 1,
          p[0],
          p[1],
          p[2],
          '未开始',
          0,
          '',
          'JavaScript',
          '',
          now,
          owner,
        ),
      ),
    );
  }
}
export async function GET() {
  const a = await requireAccount();
  if (!a) return unauthorized();
  await seed(a.accountKey);
  const r = await env.DB.prepare(
    'SELECT * FROM leetcode_problems WHERE owner_key=? ORDER BY order_no',
  )
    .bind(a.accountKey)
    .all();
  return Response.json(r.results);
}
export async function PUT(request: Request) {
  const a = await requireAccount();
  if (!a) return unauthorized();
  let b: Record<string, unknown>;
  try {
    b = (await request.json()) as Record<string, unknown>;
    if (
      !b ||
      typeof b !== 'object' ||
      !Number.isSafeInteger(b.id) ||
      Number(b.id) <= 0
    )
      throw new Error();
    if (
      b.status !== undefined &&
      !['未开始', '学习中', '已掌握', '需复习'].includes(String(b.status))
    )
      throw new Error();
    if (
      b.confidence !== undefined &&
      (!Number.isInteger(b.confidence) ||
        Number(b.confidence) < 0 ||
        Number(b.confidence) > 100)
    )
      throw new Error();
    if (
      b.language !== undefined &&
      ![
        'JavaScript',
        'TypeScript',
        'Python',
        'Java',
        'C++',
        'Go',
        'Rust',
        'SQL',
      ].includes(String(b.language))
    )
      throw new Error();
    if (
      b.code !== undefined &&
      (typeof b.code !== 'string' || b.code.length > 200_000)
    )
      throw new Error();
    if (
      b.notes !== undefined &&
      (typeof b.notes !== 'string' || b.notes.length > 200_000)
    )
      throw new Error();
  } catch {
    return Response.json({ error: '题目内容格式无效或过长' }, { status: 400 });
  }
  const r = await env.DB.prepare(
    'UPDATE leetcode_problems SET status=COALESCE(?,status),confidence=COALESCE(?,confidence),notes=COALESCE(?,notes),language=COALESCE(?,language),code=COALESCE(?,code),updated_at=? WHERE id=? AND owner_key=? RETURNING *',
  )
    .bind(
      b.status === undefined ? null : String(b.status),
      b.confidence === undefined ? null : Number(b.confidence),
      b.notes === undefined ? null : String(b.notes),
      b.language === undefined ? null : String(b.language),
      b.code === undefined ? null : String(b.code),
      Date.now(),
      Number(b.id),
      a.accountKey,
    )
    .first();
  if (!r) return Response.json({ error: '题目不存在' }, { status: 404 });
  return Response.json(r);
}
