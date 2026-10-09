'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  BriefcaseBusiness,
  CalendarDays,
  Edit3,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  INTERVIEW_STATUSES,
  interviewOutcome,
  type Interview,
  type InterviewStatus,
} from '@/lib/interviews';

const empty = {
  company: '',
  role: '',
  status: '已投递' as InterviewStatus,
  interview_date: '',
  notes: '',
};
type Draft = typeof empty;
async function request(path: string, options?: RequestInit) {
  const response = await fetch(path, options);
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(body.error || '操作失败，请稍后重试');
  }
  return response.status === 204 ? null : response.json();
}

export function InterviewRecords() {
  const [records, setRecords] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('全部');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(empty);
  const baseline = useRef(JSON.stringify(empty));
  const lock = useRef(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const result = await request('/api/interviews');
      if (!Array.isArray(result)) throw new Error('无法读取面试记录，请重试');
      setRecords(result as Interview[]);
    } catch (error) {
      setError(error instanceof Error ? error.message : '读取失败');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!open || baseline.current === JSON.stringify(draft)) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [open, draft]);

  function edit(record?: Interview) {
    const next = record
      ? {
          company: record.company,
          role: record.role,
          status: record.status,
          interview_date: record.interview_date,
          notes: record.notes,
        }
      : { ...empty };
    baseline.current = JSON.stringify(next);
    setEditingId(record?.id ?? null);
    setDraft(next);
    setError('');
    setOpen(true);
  }
  function changeOpen(next: boolean) {
    if (lock.current) return;
    if (
      !next &&
      baseline.current !== JSON.stringify(draft) &&
      !confirm('面试记录尚未保存，确定放弃修改吗？')
    )
      return;
    setOpen(next);
  }
  function apply(record: Interview) {
    setRecords((current) =>
      [record, ...current.filter((row) => row.id !== record.id)].sort(
        (a, b) => b.updated_at - a.updated_at || b.id - a.id,
      ),
    );
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await request('/api/interviews', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...draft }),
      });
      apply(result as Interview);
      setOpen(false);
      setNotice('面试记录已保存');
    } catch (error) {
      setError(error instanceof Error ? error.message : '保存失败');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function updateStatus(record: Interview, status: InterviewStatus) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await request('/api/interviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: record.id, status }),
      });
      apply(result as Interview);
      setNotice(`${record.company}已更新为“${status}”`);
    } catch (error) {
      setError(error instanceof Error ? error.message : '更新失败');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function remove(record: Interview) {
    if (lock.current || !confirm(`确定删除“${record.company}”的面试记录吗？`))
      return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await request(`/api/interviews?id=${record.id}`, { method: 'DELETE' });
      setRecords((current) => current.filter((row) => row.id !== record.id));
      setNotice('面试记录已删除');
    } catch (error) {
      setError(error instanceof Error ? error.message : '删除失败');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  const visible = records.filter(
    (record) =>
      (filter === '全部' || record.status === filter) &&
      `${record.company} ${record.role}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <div className="section-heading">
        <div>
          <span>06 · INTERVIEWS</span>
          <h2>我的面试记录</h2>
          <p>记录每一次机会、当前进展和复盘。</p>
        </div>
        <Button size="lg" onClick={() => edit()} disabled={busy || loading}>
          <Plus />
          记录面试
        </Button>
      </div>
      <div className="interview-summary">
        {[
          ['全部记录', records.length],
          [
            '进行中',
            records.filter((row) => interviewOutcome(row.status) === 'ongoing')
              .length,
          ],
          [
            '通过 / Offer',
            records.filter((row) => interviewOutcome(row.status) === 'passed')
              .length,
          ],
          [
            '未通过',
            records.filter((row) => interviewOutcome(row.status) === 'rejected')
              .length,
          ],
        ].map(([label, number]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{number}</strong>
          </div>
        ))}
      </div>
      <div className="table-toolbar interview-toolbar">
        <div className="search-box">
          <Search />
          <Input
            aria-label="搜索面试公司或岗位"
            placeholder="搜索公司或岗位"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <select
          className="form-select"
          aria-label="筛选面试状态"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option>全部</option>
          {INTERVIEW_STATUSES.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </div>
      {error && !open && (
        <div className="interview-alert" role="alert">
          {error}
          <Button
            variant="outline"
            onClick={() => void load()}
            disabled={busy || loading}
          >
            重新读取
          </Button>
        </div>
      )}
      <p className="interview-notice" role="status" aria-live="polite">
        {notice ||
          (!loading
            ? `显示 ${visible.length} 条，共 ${records.length} 条记录`
            : '正在读取面试记录…')}
      </p>
      {!loading && records.length === 0 && !error ? (
        <div className="empty-card">
          <BriefcaseBusiness className="size-8 mb-4" />
          <strong>记录你的第一家公司</strong>
          <span>从投递到结果，每个阶段都可以随时更新</span>
          <Button onClick={() => edit()}>
            <Plus />
            记录面试
          </Button>
        </div>
      ) : (
        <div className="interview-grid">
          {visible.map((record) => (
            <article className="interview-card" key={record.id}>
              <div className="interview-card-head">
                <span
                  className={`interview-status ${interviewOutcome(record.status)}`}
                >
                  {record.status}
                </span>
                <div className="row-actions">
                  <button
                    aria-label={`编辑${record.company}`}
                    onClick={() => edit(record)}
                    disabled={busy}
                  >
                    <Edit3 />
                  </button>
                  <button
                    aria-label={`删除${record.company}`}
                    onClick={() => void remove(record)}
                    disabled={busy}
                  >
                    <Trash2 />
                  </button>
                </div>
              </div>
              <h3>{record.company}</h3>
              <p className="interview-role">{record.role || '岗位待补充'}</p>
              <p className="interview-date">
                <CalendarDays />
                {record.interview_date
                  ? `面试日期：${record.interview_date}`
                  : '面试日期待定'}
              </p>
              {record.notes && (
                <p className="interview-preview">{record.notes}</p>
              )}
              <label className="interview-status-control">
                当前状态
                <select
                  className="form-select"
                  aria-label={`${record.company}的面试状态`}
                  value={record.status}
                  disabled={busy}
                  onChange={(event) =>
                    void updateStatus(
                      record,
                      event.target.value as InterviewStatus,
                    )
                  }
                >
                  {INTERVIEW_STATUSES.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
            </article>
          ))}
        </div>
      )}
      {!loading && records.length > 0 && visible.length === 0 && (
        <div className="empty-card">
          <strong>没有匹配的面试记录</strong>
          <span>调整公司关键词或状态筛选后再试</span>
          <Button
            variant="outline"
            onClick={() => {
              setQuery('');
              setFilter('全部');
            }}
          >
            清除筛选
          </Button>
        </div>
      )}
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent className="interview-dialog" showCloseButton={!busy}>
          <DialogHeader>
            <DialogTitle>
              {editingId ? '编辑面试记录' : '记录一次面试'}
            </DialogTitle>
            <DialogDescription>
              公司名称必填，其他信息可以稍后补充。
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="interview-form">
            <fieldset disabled={busy}>
              <label>
                公司名称
                <Input
                  required
                  maxLength={160}
                  value={draft.company}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      company: event.target.value,
                    }))
                  }
                  placeholder="例如：字节跳动"
                  autoFocus
                />
              </label>
              <label>
                应聘岗位
                <Input
                  maxLength={160}
                  value={draft.role}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      role: event.target.value,
                    }))
                  }
                  placeholder="例如：后端开发实习生"
                />
              </label>
              <div className="form-row">
                <label>
                  面试状态
                  <select
                    className="form-select"
                    value={draft.status}
                    aria-label="面试状态"
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        status: event.target.value as InterviewStatus,
                      }))
                    }
                  >
                    {INTERVIEW_STATUSES.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <label>
                  面试日期
                  <Input
                    type="date"
                    value={draft.interview_date}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        interview_date: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <label>
                面试复盘与备注
                <Textarea
                  rows={6}
                  maxLength={20_000}
                  value={draft.notes}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="问到了什么？哪些地方需要准备？下一轮有什么提醒？"
                />
              </label>
            </fieldset>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="interview-form-actions">
              <Button
                type="button"
                variant="outline"
                onClick={() => changeOpen(false)}
                disabled={busy}
              >
                取消
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? '保存中…' : '保存面试记录'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
