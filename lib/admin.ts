import { env } from 'cloudflare:workers';

// Only the server-resolved owner key grants administrative access.
export function isAdminAccount(account: { accountKey: string } | null | undefined) {
  return account?.accountKey === 'mty';
}

const tables = [
  ['internships', 'internships'],
  ['contacts', 'contacts'],
  ['leetcode_problems', 'problems'],
  ['foundation_topics', 'foundations'],
  ['quick_notes', 'notes'],
  ['interviews', 'interviews'],
  ['interview_experiences', 'experiences'],
] as const;

export type AdminUser = {
  owner_key: string;
  username: string | null;
  account_name: string;
  created_at: number | null;
  last_login_at: number | null;
  credential_updated_at: number | null;
  active_sessions: number;
  internships: number;
  contacts: number;
  problems: number;
  foundations: number;
  notes: number;
  interviews: number;
  experiences: number;
};

// Static identifiers only; all visitor-supplied values are bound parameters.
// D1 has a tighter compound-SELECT limit than desktop SQLite. Materialize
// bounded groups so the planner cannot flatten them into one oversized UNION.
const ownerSources = ["SELECT 'mty' AS owner_key", 'SELECT owner_key FROM login_credentials',
  ...tables.map(([table]) => `SELECT owner_key FROM ${table}`)];
const ownerGroups = [ownerSources.slice(0, 3), ownerSources.slice(3, 6), ownerSources.slice(6)];
const owners = `WITH ${ownerGroups.map((group, index) =>
  `owner_group_${index} AS MATERIALIZED (${group.join(' UNION ')})`).join(',\n')},
  owners AS (${ownerGroups.map((_, index) => `SELECT owner_key FROM owner_group_${index}`).join(' UNION ')})`;
const filter = `WHERE instr(lower(coalesce(c.username,'')),?)>0
  OR instr(lower(coalesce(c.account_name,'')),?)>0
  OR instr(lower(o.owner_key),?)>0`;

export async function readAdminUsers(query = '', page = 1) {
  const search = query.trim().toLowerCase();
  const pageSize = 20;
  const count = await env.DB.prepare(`${owners}
    SELECT count(*) AS total FROM owners o
    LEFT JOIN login_credentials c ON c.owner_key=o.owner_key ${filter}`)
    .bind(search, search, search).first<{ total: number }>();
  const total = Number(count?.total ?? 0);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
  const result = await env.DB.prepare(`${owners}
    SELECT o.owner_key,c.username,
      coalesce(c.account_name,CASE WHEN o.owner_key='mty' THEN 'mty' ELSE 'OpenAI 账户' END) AS account_name,
      c.created_at,c.last_login_at,c.updated_at AS credential_updated_at,
      (SELECT count(*) FROM login_sessions s WHERE s.owner_key=o.owner_key
        AND s.credential_version=c.version AND s.expires_at>?) AS active_sessions,
      ${tables.map(([table, alias]) => `(SELECT count(*) FROM ${table} t WHERE t.owner_key=o.owner_key) AS ${alias}`).join(',\n')}
    FROM owners o LEFT JOIN login_credentials c ON c.owner_key=o.owner_key ${filter}
    ORDER BY CASE WHEN o.owner_key='mty' THEN 0 ELSE 1 END,
      c.created_at DESC,coalesce(c.username,o.owner_key) ASC LIMIT ? OFFSET ?`)
    .bind(Date.now(), search, search, search, pageSize, (currentPage - 1) * pageSize)
    .all<AdminUser>();
  const summary = await env.DB.prepare(`${owners}
    SELECT (SELECT count(*) FROM owners) AS accounts,
      (SELECT count(*) FROM login_credentials) AS password_accounts,
      (SELECT count(*) FROM quick_notes) AS notes,
      (SELECT count(*) FROM interviews) AS interviews,
      (SELECT count(*) FROM interview_experiences) AS experiences`).first<{
      accounts: number; password_accounts: number; notes: number; interviews: number; experiences: number;
    }>();
  return { users: result.results, total, page: currentPage, pageSize, summary };
}

export type AdminData = Awaited<ReturnType<typeof readAdminUsers>>;
