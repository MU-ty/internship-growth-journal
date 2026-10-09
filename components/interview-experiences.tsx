'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  BookOpen,
  Edit3,
  ExternalLink,
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
  emptyExperience,
  type ExperienceDraft,
  type InterviewExperience,
} from '@/lib/interview-experiences';

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
export function InterviewExperiences() {
  const [records, setRecords] = useState<InterviewExperience[]>([]);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [query, setQuery] = useState(''),
    [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<ExperienceDraft>({ ...emptyExperience });
  const [reading, setReading] = useState<InterviewExperience | null>(null);
  const baseline = useRef(JSON.stringify(emptyExperience)),
    lock = useRef(false);
  async function load() {
    setLoading(true);
    setError('');
    try {
      const result = await request('/api/interview-experiences');
      if (!Array.isArray(result)) throw new Error('无法读取面经，请重试');
      setRecords(result as InterviewExperience[]);
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
      if (open && baseline.current !== JSON.stringify(draft)) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [open, draft]);
  function edit(record?: InterviewExperience) {
    const next = record
      ? {
          title: record.title,
          company: record.company,
          role: record.role,
          round: record.round,
          interview_date: record.interview_date,
          source_url: record.source_url,
          content: record.content,
        }
      : { ...emptyExperience };
    baseline.current = JSON.stringify(next);
    setDraft(next);
    setEditingId(record?.id ?? null);
    setError('');
    setReading(null);
    setOpen(true);
  }
  function close(next: boolean) {
    if (lock.current) return;
    if (
      !next &&
      baseline.current !== JSON.stringify(draft) &&
      !confirm('面经尚未保存，确定放弃修改吗？')
    )
      return;
    setOpen(next);
  }
  function change(key: keyof ExperienceDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = (await request('/api/interview-experiences', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...draft }),
      })) as InterviewExperience;
      setRecords((current) =>
        [result, ...current.filter((row) => row.id !== result.id)].sort(
          (a, b) => b.updated_at - a.updated_at || b.id - a.id,
        ),
      );
      setOpen(false);
      setNotice('面经已保存');
    } catch (error) {
      setError(error instanceof Error ? error.message : '保存失败');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function remove(record: InterviewExperience) {
    if (lock.current || !confirm(`确定删除面经“${record.title}”吗？`)) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await request(`/api/interview-experiences?id=${record.id}`, {
        method: 'DELETE',
      });
      setRecords((current) => current.filter((row) => row.id !== record.id));
      setNotice('面经已删除');
    } catch (error) {
      setError(error instanceof Error ? error.message : '删除失败');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const visible = records.filter((row) =>
    `${row.title} ${row.company} ${row.role} ${row.round} ${row.content}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <div className="section-heading">
        <div>
          <span>07 · INTERVIEW LIBRARY</span>
          <h2>我的面经收藏</h2>
          <p>收藏他人的经验，也记录自己的问题、回答与复盘。</p>
        </div>
        <Button size="lg" onClick={() => edit()} disabled={loading || busy}>
          <Plus />
          保存面经
        </Button>
      </div>
      <div className="table-toolbar interview-toolbar">
        <div className="search-box">
          <Search />
          <Input
            aria-label="搜索面经"
            placeholder="搜索标题、公司、岗位或正文"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
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
      <p className="interview-notice" role="status">
        {notice ||
          (loading
            ? '正在读取面经…'
            : `显示 ${visible.length} 篇，共 ${records.length} 篇面经`)}
      </p>
      {!loading && !records.length && !error ? (
        <div className="empty-card">
          <BookOpen className="size-8 mb-4" />
          <strong>把值得回看的面经留在这里</strong>
          <span>粘贴面经正文、补充来源链接，或者记录自己的面试经历</span>
          <Button onClick={() => edit()}>
            <Plus />
            保存面经
          </Button>
        </div>
      ) : (
        <div className="interview-grid">
          {visible.map((record) => (
            <article
              className="interview-card experience-library-card"
              key={record.id}
            >
              <div className="interview-card-head">
                <span className="interview-status">
                  {record.round || '面经'}
                </span>
                <div className="row-actions">
                  <button
                    aria-label={`编辑${record.title}`}
                    disabled={busy}
                    onClick={() => edit(record)}
                  >
                    <Edit3 />
                  </button>
                  <button
                    aria-label={`删除${record.title}`}
                    disabled={busy}
                    onClick={() => void remove(record)}
                  >
                    <Trash2 />
                  </button>
                </div>
              </div>
              <h3>{record.title}</h3>
              <p className="interview-role">
                {[record.company, record.role].filter(Boolean).join(' · ') ||
                  '公司与岗位未填写'}
              </p>
              {record.interview_date && (
                <p className="interview-date">
                  面试日期：{record.interview_date}
                </p>
              )}
              <p className="interview-preview experience-library-preview">
                {record.content}
              </p>
              <div className="experience-library-actions">
                <Button variant="outline" onClick={() => setReading(record)}>
                  <BookOpen />
                  查看全文
                </Button>
                {record.source_url && (
                  <a
                    href={record.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink />
                    原文链接
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {!loading && records.length > 0 && !visible.length && (
        <div className="empty-card">
          <strong>没有匹配的面经</strong>
          <Button variant="outline" onClick={() => setQuery('')}>
            清除搜索
          </Button>
        </div>
      )}
      <Dialog open={open} onOpenChange={close}>
        <DialogContent
          className="interview-dialog experience-library-dialog"
          showCloseButton={!busy}
        >
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑面经' : '保存一篇面经'}</DialogTitle>
            <DialogDescription>
              标题和正文必填。手动保存，不会在输入过程中更新正文或移动光标。
            </DialogDescription>
          </DialogHeader>
          <form className="interview-form" onSubmit={submit}>
            <fieldset disabled={busy}>
              <label>
                面经标题
                <Input
                  required
                  maxLength={200}
                  value={draft.title}
                  onChange={(event) => change('title', event.target.value)}
                  placeholder="例如：某公司后端实习一面面经"
                  autoFocus
                />
              </label>
              <div className="form-row">
                <label>
                  公司
                  <Input
                    maxLength={160}
                    value={draft.company}
                    onChange={(event) => change('company', event.target.value)}
                  />
                </label>
                <label>
                  岗位
                  <Input
                    maxLength={160}
                    value={draft.role}
                    onChange={(event) => change('role', event.target.value)}
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  面试轮次
                  <Input
                    maxLength={80}
                    value={draft.round}
                    onChange={(event) => change('round', event.target.value)}
                    placeholder="一面 / 二面 / HR 面"
                  />
                </label>
                <label>
                  面试日期
                  <Input
                    type="date"
                    value={draft.interview_date}
                    onChange={(event) =>
                      change('interview_date', event.target.value)
                    }
                  />
                </label>
              </div>
              <label>
                来源链接（可选）
                <Input
                  type="url"
                  maxLength={2000}
                  value={draft.source_url}
                  onChange={(event) => change('source_url', event.target.value)}
                  placeholder="https://…"
                />
              </label>
              <label>
                面经正文
                <Textarea
                  required
                  rows={12}
                  maxLength={100_000}
                  value={draft.content}
                  onChange={(event) => change('content', event.target.value)}
                  placeholder="可以直接粘贴面经，或分段写下：面试问题、回答思路、追问、复盘与准备建议。"
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
                onClick={() => close(false)}
                disabled={busy}
              >
                取消
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? '保存中…' : '保存面经'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!reading}
        onOpenChange={(next) => {
          if (!next) setReading(null);
        }}
      >
        <DialogContent className="interview-dialog experience-library-dialog">
          <DialogHeader>
            <DialogTitle>{reading?.title}</DialogTitle>
            <DialogDescription>
              {reading
                ? [
                    reading.company,
                    reading.role,
                    reading.round,
                    reading.interview_date,
                  ]
                    .filter(Boolean)
                    .join(' · ') || '面经全文'
                : '面经全文'}
            </DialogDescription>
          </DialogHeader>
          <div className="experience-library-body">{reading?.content}</div>
          {reading && (
            <div className="experience-library-actions">
              {reading.source_url && (
                <a
                  href={reading.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink />
                  查看来源原文
                </a>
              )}
              <Button onClick={() => edit(reading)} disabled={busy}>
                <Edit3 />
                编辑面经
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
