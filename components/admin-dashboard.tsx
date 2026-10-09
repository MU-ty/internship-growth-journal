'use client';

import { useEffect, useState } from 'react';
import type { AdminData, AdminUser } from '@/lib/admin';
import { RegistrationControl } from '@/components/registration-control';

const records = [['internships', '实习'], ['contacts', '人脉'], ['problems', '力扣'], ['foundations', '基础知识'], ['notes', '随手记'], ['interviews', '面试'], ['experiences', '面经']] as const;
const date = (value: number | null) => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '未记录';
const totalRecords = (user: AdminUser) => records.reduce((sum, [key]) => sum + user[key], 0);

export function AdminDashboard() {
  const [data, setData] = useState<AdminData | null>(null);
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetch(`/api/admin/users?q=${encodeURIComponent(query)}&page=${page}`, { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error(response.status === 403 ? '当前账户没有管理权限。' : response.status === 401 ? '登录已过期，请重新登录。' : '暂时无法加载账户信息，请重试。');
        return response.json() as Promise<AdminData>;
      })
      .then(value => { if (!controller.signal.aborted) { setData(value); setExpanded(null); } })
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, page, refresh]);

  return <main className="admin-shell">
    <header className="admin-heading"><div><a href="/">← 返回成长坐标</a><p className="admin-eyebrow">MTY · ADMINISTRATION</p><h1>账户管理端</h1><p>查看账户信息与数据概况，让每一份成长记录都有迹可循。</p></div><a className="admin-button" href="/account">mty 账户设置</a></header>
    <section className="admin-stats" aria-label="网站数据概况">
      {[['账户总数', data?.summary?.accounts], ['密码账户', data?.summary?.password_accounts], ['随手记', data?.summary?.notes], ['面试记录', data?.summary?.interviews], ['面经', data?.summary?.experiences]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value ?? '—'}</strong></div>)}
    </section>
    <RegistrationControl />
    <section className="admin-panel">
      <div className="admin-panel-heading"><div><h2>账户列表</h2><p>仅 mty 可访问 · 只读管理</p></div><button className="admin-button" disabled={loading} onClick={() => setRefresh(value => value + 1)}>刷新</button></div>
      <form className="admin-search" onSubmit={event => { event.preventDefault(); setQuery(draft.trim()); setPage(1); setRefresh(value => value + 1); }}><label htmlFor="admin-search">搜索账户</label><input id="admin-search" value={draft} onChange={event => setDraft(event.target.value)} maxLength={100} placeholder="账号、昵称或账户 ID"/><button className="admin-button admin-primary" type="submit">搜索</button></form>
      <p className="admin-help">旧账户未保存的注册时间显示“未记录”。OpenAI 账户仅列出已有业务记录的账户；最近登录和会话数仅统计账号密码登录。</p>
      <div role="status" aria-live="polite" className="admin-status">{loading ? '正在加载账户信息…' : error || `共 ${data?.total ?? 0} 个匹配账户`}</div>
      {error ? <button className="admin-button" onClick={() => setRefresh(value => value + 1)}>重试</button> : <div className="admin-table-scroll" aria-busy={loading}><table className="admin-table"><thead><tr><th>账户</th><th>登录方式</th><th>注册时间</th><th>最近密码登录</th><th>有效会话</th><th>记录数量</th><th>详情</th></tr></thead><tbody>
        {data?.users.map(user => <AccountRow key={user.owner_key} user={user} expanded={expanded === user.owner_key} onToggle={() => setExpanded(expanded === user.owner_key ? null : user.owner_key)}/>)}
        {!loading && !data?.users.length && <tr><td colSpan={7} className="admin-empty">没有找到匹配账户，试试其他关键词。</td></tr>}
      </tbody></table></div>}
      <div className="admin-pagination"><span>第 {data?.page ?? 1} / {Math.max(1, Math.ceil((data?.total ?? 0) / 20))} 页</span><button className="admin-button" disabled={loading || !data || data.page <= 1} onClick={() => setPage((data?.page ?? 1) - 1)}>上一页</button><button className="admin-button" disabled={loading || !data || data.page * data.pageSize >= data.total} onClick={() => setPage((data?.page ?? 1) + 1)}>下一页</button></div>
    </section>
    <p className="admin-help">管理端只展示账户元信息和记录数量，不展示密码、登录令牌或用户笔记正文。</p>
  </main>;
}

function AccountRow({ user, expanded, onToggle }: { user: AdminUser; expanded: boolean; onToggle: () => void }) {
  return <><tr><td><strong>{user.username || user.account_name}</strong>{user.owner_key === 'mty' && <span className="admin-badge">管理员</span>}<small>{user.account_name}</small></td><td>{user.username ? '账号密码' : 'OpenAI'}</td><td>{date(user.created_at)}</td><td>{date(user.last_login_at)}</td><td>{user.active_sessions}</td><td>{totalRecords(user)}</td><td><button className="admin-button" aria-expanded={expanded} onClick={onToggle}>{expanded ? '收起' : '查看'}</button></td></tr>{expanded && <tr><td colSpan={7}><div className="admin-detail"><p>账户 ID：<code>{user.owner_key}</code></p><p>账户凭据更新：{date(user.credential_updated_at)}</p><div className="admin-records">{records.map(([key, label]) => <span key={key}>{label}<strong>{user[key]}</strong></span>)}</div></div></td></tr>}</>;
}
