import { env } from 'cloudflare:workers';
import { requireAccount, unauthorized } from '@/lib/account';
const DEFAULTS = [
  ['计算机网络', 'OSI / TCP-IP 模型'],
  ['计算机网络', 'HTTP / HTTPS'],
  ['计算机网络', 'TCP 连接与可靠传输'],
  ['计算机网络', 'DNS 与 CDN'],
  ['操作系统', '进程、线程与协程'],
  ['操作系统', '内存管理与虚拟内存'],
  ['操作系统', '死锁与并发控制'],
  ['操作系统', '文件系统与 I/O'],
  ['数据库', '索引与 B+ 树'],
  ['数据库', '事务与隔离级别'],
  ['数据库', 'SQL 优化'],
  ['数据库', '锁与 MVCC'],
  ['计算机组成', 'CPU 与指令执行'],
  ['计算机组成', '缓存与局部性'],
  ['计算机组成', '数据表示'],
  ['计算机组成', '编译、链接与装载'],
];
async function seed(owner: string) {
  const row = await env.DB.prepare(
    'SELECT COUNT(*) AS count FROM foundation_topics WHERE owner_key=?',
  )
    .bind(owner)
    .first<{ count: number }>();
  if (!row?.count) {
    const now = Date.now();
    await env.DB.batch(
      DEFAULTS.map((p) =>
        env.DB.prepare(
          'INSERT INTO foundation_topics (area,topic,status,confidence,last_reviewed,notes,created_at,owner_key) VALUES (?,?,?,?,?,?,?,?)',
        ).bind(p[0], p[1], '待学习', 0, '', '', now, owner),
      ),
    );
  }
}
export async function GET() {
  const a = await requireAccount();
  if (!a) return unauthorized();
  await seed(a.accountKey);
  const r = await env.DB.prepare(
    'SELECT * FROM foundation_topics WHERE owner_key=? ORDER BY area,id',
  )
    .bind(a.accountKey)
    .all();
  return Response.json(r.results);
}
export async function POST(request: Request) {
  const a = await requireAccount();
  if (!a) return unauthorized();
  const b = (await request.json()) as Record<string, string | number>;
  const r = await env.DB.prepare(
    'INSERT INTO foundation_topics (area,topic,status,confidence,last_reviewed,notes,created_at,owner_key) VALUES (?,?,?,?,?,?,?,?) RETURNING *',
  )
    .bind(
      String(b.area).trim(),
      String(b.topic).trim(),
      String(b.status ?? '待学习'),
      Number(b.confidence ?? 0),
      String(b.last_reviewed ?? ''),
      String(b.notes ?? ''),
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
    'UPDATE foundation_topics SET area=?,topic=?,status=?,confidence=?,last_reviewed=?,notes=? WHERE id=? AND owner_key=? RETURNING *',
  )
    .bind(
      String(b.area).trim(),
      String(b.topic).trim(),
      String(b.status),
      Number(b.confidence),
      String(b.last_reviewed ?? ''),
      String(b.notes ?? ''),
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
  await env.DB.prepare(
    'DELETE FROM foundation_topics WHERE id=? AND owner_key=?',
  )
    .bind(Number(id), a.accountKey)
    .run();
  return new Response(null, { status: 204 });
}
