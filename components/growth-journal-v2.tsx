'use client';
import {
  FormEvent,
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowUpRight,
  BookOpenCheck,
  BriefcaseBusiness,
  Code2,
  Database,
  Edit3,
  ClipboardList,
  Network,
  NotebookPen,
  Plus,
  Save,
  Search,
  Sparkles,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react';
import { QuickNotes } from '@/components/quick-notes';
import { InterviewRecords } from '@/components/interview-records';
import { InterviewExperiences } from '@/components/interview-experiences';
import { LogoutButton } from '@/components/account-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
type Internship = {
  id: number;
  company: string;
  role: string;
  period: string;
  summary: string;
  highlights: string;
};
type Contact = {
  id: number;
  name: string;
  relationship: string;
  value: string;
  direction: string;
  closeness: number;
};
type Problem = {
  id: number;
  order_no: number;
  title: string;
  category: string;
  difficulty: string;
  status: string;
  confidence: number;
  notes: string;
  language: string;
  code: string;
};
type Topic = {
  id: number;
  area: string;
  topic: string;
  status: string;
  confidence: number;
  last_reviewed: string;
  notes: string;
};
type Tab =
  | 'internships'
  | 'network'
  | 'leetcode'
  | 'foundations'
  | 'notes'
  | 'interviews'
  | 'experiences';
type Modal = 'internship' | 'contact' | 'foundation' | null;
const emptyI = {
    company: '',
    role: '',
    period: '',
    summary: '',
    highlights: '',
  },
  emptyC = {
    name: '',
    relationship: '',
    value: '',
    direction: '',
    closeness: 2,
  },
  emptyF = {
    area: '计算机网络',
    topic: '',
    status: '待学习',
    confidence: 0,
    last_reviewed: '',
    notes: '',
  };
const problemStatuses = ['未开始', '学习中', '已掌握', '需复习'];
const CodeEditor = lazy(() =>
  import('@/components/code-editor').then((module) => ({
    default: module.CodeEditor,
  })),
);
export function GrowthJournalV2({ accountName, isAdmin = false }: { accountName: string; isAdmin?: boolean }) {
  const [tab, setTab] = useState<Tab>('internships'),
    [internships, setInternships] = useState<Internship[]>([]),
    [contacts, setContacts] = useState<Contact[]>([]),
    [problems, setProblems] = useState<Problem[]>([]),
    [topics, setTopics] = useState<Topic[]>([]);
  const [modal, setModal] = useState<Modal>(null),
    [editingId, setEditingId] = useState<number | null>(null),
    [iForm, setIForm] = useState(emptyI),
    [cForm, setCForm] = useState(emptyC),
    [fForm, setFForm] = useState(emptyF),
    [codeProblem, setCodeProblem] = useState<Problem | null>(null),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(''),
    [filter, setFilter] = useState('全部'),
    [query, setQuery] = useState('');
  const problemQueue = useRef<Promise<void>>(Promise.resolve());
  const latestProblems = useRef(problems);
  latestProblems.current = problems;
  async function refresh() {
    setError('');
    try {
      const rs = await Promise.all(
        [
          '/api/internships',
          '/api/contacts',
          '/api/leetcode',
          '/api/foundations',
        ].map((x) => fetch(x)),
      );
      if (rs.some((x) => !x.ok)) throw 0;
      const [a, b, c, d] = await Promise.all(rs.map((x) => x.json()));
      if (![a, b, c, d].every(Array.isArray)) throw new Error('数据格式错误');
      setInternships(a as Internship[]);
      setContacts(b as Contact[]);
      setProblems(c as Problem[]);
      setTopics(d as Topic[]);
    } catch {
      setError('暂时无法读取数据，请稍后重试。');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  function close() {
    setModal(null);
    setEditingId(null);
    setError('');
  }
  function openI(x?: Internship) {
    setModal('internship');
    setEditingId(x?.id ?? null);
    setIForm(
      x
        ? {
            company: x.company,
            role: x.role,
            period: x.period,
            summary: x.summary,
            highlights: x.highlights,
          }
        : emptyI,
    );
  }
  function openC(x?: Contact) {
    setModal('contact');
    setEditingId(x?.id ?? null);
    setCForm(
      x
        ? {
            name: x.name,
            relationship: x.relationship,
            value: x.value,
            direction: x.direction,
            closeness: x.closeness || 2,
          }
        : emptyC,
    );
  }
  function openF(x?: Topic) {
    setModal('foundation');
    setEditingId(x?.id ?? null);
    setFForm(
      x
        ? {
            area: x.area,
            topic: x.topic,
            status: x.status,
            confidence: x.confidence,
            last_reviewed: x.last_reviewed,
            notes: x.notes,
          }
        : emptyF,
    );
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const path =
        modal === 'internship'
          ? '/api/internships'
          : modal === 'contact'
            ? '/api/contacts'
            : '/api/foundations',
      body =
        modal === 'internship' ? iForm : modal === 'contact' ? cForm : fForm;
    try {
      const r = await fetch(path, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, id: editingId }),
      });
      if (!r.ok) throw new Error('保存失败');
      await refresh();
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }
  async function remove(path: string, id: number) {
    if (!confirm('确定删除这条记录吗？')) return;
    try {
      const response = await fetch(`/api/${path}?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('删除失败，请重试');
      await refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : '删除失败，请重试');
    }
  }
  async function updateProblem(p: Problem, patch: Partial<Problem>) {
    const next = {
      ...(latestProblems.current.find((row) => row.id === p.id) ?? p),
      ...patch,
    };
    latestProblems.current = latestProblems.current.map((x) =>
      x.id === p.id ? next : x,
    );
    setProblems(latestProblems.current);
    const job = problemQueue.current.then(async () => {
      try {
        const r = await fetch('/api/leetcode', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: p.id, ...patch }),
        });
        if (!r.ok) throw new Error('题目修改未保存，请检查网络后重试');
      } catch (error) {
        setError(
          error instanceof Error ? error.message : '题目修改未保存，请重试',
        );
      }
    });
    problemQueue.current = job;
    await job;
  }
  const solved = problems.filter((x) => x.status === '已掌握').length,
    learning = problems.filter((x) => x.status === '学习中').length,
    review = problems.filter((x) => x.status === '需复习').length,
    visible = problems.filter(
      (p) =>
        (filter === '全部' || p.status === filter) &&
        (!query || p.title.includes(query) || p.category.includes(query)),
    );
  const cats = useMemo(
    () =>
      Array.from(new Set(problems.map((p) => p.category))).map((name) => ({
        name,
        total: problems.filter((p) => p.category === name).length,
        done: problems.filter(
          (p) => p.category === name && p.status === '已掌握',
        ).length,
      })),
    [problems],
  );
  return (
    <main className="min-h-screen">
      <Header
        internships={internships.length}
        contacts={contacts.length}
        solved={solved}
        accountName={accountName}
        isAdmin={isAdmin}
      />
      <nav className="tabs four five">
        {(
          [
            ['internships', BriefcaseBusiness, '实习收获'],
            ['network', Network, '人脉图谱'],
            ['leetcode', Code2, 'Hot 100'],
            ['foundations', Database, '计算机基础'],
            ['notes', StickyNote, '随手记'],
            ['interviews', ClipboardList, '面试记录'],
            ['experiences', BookOpenCheck, '面经收藏'],
          ] as const
        ).map(([k, I, l]) => (
          <button
            key={k}
            className={tab === k ? 'active' : ''}
            onClick={() => setTab(k)}
          >
            <I />
            {l}
          </button>
        ))}
      </nav>
      {error && !modal && (
        <div className="journal-alert" role="alert">
          {error}
          <button onClick={() => void refresh()}>重新读取</button>
        </div>
      )}
      {tab === 'internships' && (
        <section className="content-section">
          <Heading
            no="01"
            en="EXPERIENCE"
            title="我的实习足迹"
            copy="把项目、方法与思考，整理成属于自己的经验库。"
          >
            <Button size="lg" onClick={() => openI()}>
              <Plus />
              记录一段实习
            </Button>
          </Heading>
          {loading ? (
            <Empty />
          ) : internships.length === 0 ? (
            <button className="empty-card clickable" onClick={() => openI()}>
              <strong>从第一段实习开始记录</strong>
              <span>写下公司、岗位与核心收获</span>
            </button>
          ) : (
            <div className="experience-grid">
              {internships.map((x, i) => (
                <article className="experience-card" key={x.id}>
                  <div className="card-number">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div className="card-actions visible">
                    <button onClick={() => openI(x)}>
                      <Edit3 />
                    </button>
                    <button onClick={() => remove('internships', x.id)}>
                      <Trash2 />
                    </button>
                  </div>
                  <span className="period">{x.period || '时间待补充'}</span>
                  <h3>{x.company}</h3>
                  <p className="role">{x.role}</p>
                  <p className="summary">{x.summary}</p>
                  {x.highlights && (
                    <div className="highlights">
                      <Sparkles />
                      {x.highlights}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
      {tab === 'network' && (
        <section className="content-section wide">
          <Heading
            no="02"
            en="CONNECTIONS"
            title="我的人脉图谱"
            copy="距离代表关系亲近度；点击任一节点即可修改。"
          >
            <Button size="lg" onClick={() => openC()}>
              <Plus />
              添加同行者
            </Button>
          </Heading>
          <div className="network-layout">
            <NetworkGraph contacts={contacts} edit={openC} />
            <aside className="people-list">
              <div className="people-list-head">
                <strong>全部关系</strong>
                <span>{contacts.length} 人</span>
              </div>
              {contacts.length === 0 ? (
                <p>还没有节点。</p>
              ) : (
                contacts.map((x) => (
                  <button key={x.id} onClick={() => openC(x)}>
                    <span className={`distance-dot d${x.closeness || 2}`} />
                    <div>
                      <strong>{x.name}</strong>
                      <small>
                        {x.relationship} ·{' '}
                        {['', '核心关系', '常联系', '认识'][x.closeness || 2]}
                      </small>
                    </div>
                    <Edit3 />
                  </button>
                ))
              )}
            </aside>
          </div>
        </section>
      )}
      {tab === 'leetcode' && (
        <section className="content-section wide">
          <Heading
            no="03"
            en="ALGORITHM"
            title="LeetCode Hot 100"
            copy="每道题都可以保存完整代码与自由笔记。"
          />
          <div className="leetcode-dashboard">
            <div className="progress-overview">
              <div
                className="donut"
                style={{ '--progress': `${solved}%` } as React.CSSProperties}
              >
                <strong>{solved}%</strong>
                <span>掌握率</span>
              </div>
              <div className="progress-numbers">
                {[
                  [solved, '已掌握'],
                  [learning, '学习中'],
                  [review, '需复习'],
                  [100 - solved - learning - review, '未开始'],
                ].map((x) => (
                  <div key={x[1]}>
                    <b>{x[0]}</b>
                    <span>{x[1]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="heat-board">
              <strong>100 题掌握画板</strong>
              <div className="heat-grid">
                {problems.map((p) => (
                  <button
                    key={p.id}
                    title={`${p.order_no}. ${p.title} · ${p.status}`}
                    className={`heat-cell s-${p.status}`}
                    onClick={() =>
                      updateProblem(p, {
                        status: p.status === '已掌握' ? '需复习' : '已掌握',
                        confidence: p.status === '已掌握' ? 60 : 100,
                      })
                    }
                  >
                    {p.order_no}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="category-bars">
            {cats.map((x) => (
              <div key={x.name}>
                <span>{x.name}</span>
                <i>
                  <b style={{ width: `${(x.done / x.total) * 100}%` }} />
                </i>
                <em>
                  {x.done}/{x.total}
                </em>
              </div>
            ))}
          </div>
          <div className="table-toolbar">
            <div className="search-box">
              <Search />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索题目或分类"
              />
            </div>
            <div className="filter-pills">
              {['全部', ...problemStatuses].map((s) => (
                <button
                  key={s}
                  className={filter === s ? 'active' : ''}
                  onClick={() => setFilter(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="data-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>题目</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>难度</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>信心值</TableHead>
                  <TableHead>代码与笔记</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.order_no}</TableCell>
                    <TableCell className="problem-name">{p.title}</TableCell>
                    <TableCell>
                      <span className="tag">{p.category}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`difficulty ${p.difficulty}`}>
                        {p.difficulty}
                      </span>
                    </TableCell>
                    <TableCell>
                      <select
                        value={p.status}
                        onChange={(e) =>
                          updateProblem(p, { status: e.target.value })
                        }
                      >
                        {problemStatuses.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <input
                        className="confidence-range"
                        type="range"
                        min="0"
                        max="100"
                        step="10"
                        value={p.confidence}
                        onChange={(e) =>
                          updateProblem(p, {
                            confidence: Number(e.target.value),
                          })
                        }
                      />
                      <small>{p.confidence}%</small>
                    </TableCell>
                    <TableCell>
                      <button
                        className="code-note-button"
                        onClick={() => setCodeProblem(p)}
                      >
                        <NotebookPen />
                        <span>
                          {p.code
                            ? `已保存 · ${p.language}`
                            : p.notes
                              ? '已有笔记'
                              : '写代码 / 笔记'}
                        </span>
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
      {tab === 'foundations' && (
        <section className="content-section wide">
          <Heading
            no="04"
            en="FOUNDATIONS"
            title="计算机基础多维表"
            copy="直接维护领域、状态、掌握度、复习时间与笔记。"
          >
            <Button size="lg" onClick={() => openF()}>
              <Plus />
              新增知识点
            </Button>
          </Heading>
          <div className="foundation-summary">
            {['计算机网络', '操作系统', '数据库', '计算机组成'].map((a, i) => {
              const rows = topics.filter((t) => t.area === a),
                avg = rows.length
                  ? Math.round(
                      rows.reduce((n, x) => n + x.confidence, 0) / rows.length,
                    )
                  : 0;
              return (
                <div key={a}>
                  <span className={`foundation-icon fi${i}`}>
                    <BookOpenCheck />
                  </span>
                  <div>
                    <strong>{a}</strong>
                    <small>{rows.length} 个知识点</small>
                  </div>
                  <b>{avg}%</b>
                </div>
              );
            })}
          </div>
          <div className="multidim">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>领域</TableHead>
                  <TableHead>知识点</TableHead>
                  <TableHead>学习状态</TableHead>
                  <TableHead>掌握度</TableHead>
                  <TableHead>最近复习</TableHead>
                  <TableHead>笔记</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {topics.map((t, i) => (
                  <TableRow key={t.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>
                      <span className="area-chip">{t.area}</span>
                    </TableCell>
                    <TableCell className="topic-name">{t.topic}</TableCell>
                    <TableCell>
                      <span className={`status-chip st-${t.status}`}>
                        {t.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="mastery">
                        <i>
                          <b style={{ width: `${t.confidence}%` }} />
                        </i>
                        <span>{t.confidence}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{t.last_reviewed || '—'}</TableCell>
                    <TableCell className="notes-cell">
                      {t.notes || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="row-actions">
                        <button onClick={() => openF(t)}>
                          <Edit3 />
                        </button>
                        <button onClick={() => remove('foundations', t.id)}>
                          <Trash2 />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <button className="add-row" onClick={() => openF()}>
              <Plus />
              新增一条记录
            </button>
          </div>
        </section>
      )}
      <section className="content-section wide" hidden={tab !== 'notes'}>
        <Heading
          no="05"
          en="QUICK NOTES"
          title="随手记"
          copy="捕捉灵感、整理思路，内容会自动保存到当前账号。"
        />
        <QuickNotes />
      </section>
      <section className="content-section wide" hidden={tab !== 'interviews'}>
        <InterviewRecords />
      </section>
      <section className="content-section wide" hidden={tab !== 'experiences'}>
        <InterviewExperiences />
      </section>
      <footer>
        <span>GROW · CONNECT · BECOME</span>
        <p>所有经历都在成为你的一部分。</p>
        <ArrowUpRight />
      </footer>
      {modal && (
        <Editor
          modal={modal}
          editing={!!editingId}
          close={close}
          submit={submit}
          saving={saving}
          error={error}
          iForm={iForm}
          setIForm={setIForm}
          cForm={cForm}
          setCForm={setCForm}
          fForm={fForm}
          setFForm={setFForm}
        />
      )}
      {codeProblem && (
        <CodeNotebook
          problem={codeProblem}
          close={() => setCodeProblem(null)}
          saved={(p) => {
            setProblems((v) => v.map((x) => (x.id === p.id ? p : x)));
            setCodeProblem(null);
          }}
        />
      )}
    </main>
  );
}
function CodeNotebook({
  problem,
  close,
  saved,
}: {
  problem: Problem;
  close: () => void;
  saved: (p: Problem) => void;
}) {
  const [draft, setDraft] = useState(problem),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState('');
  const saveLock = useRef(false);
  const currentDraft = useRef(draft);
  currentDraft.current = draft;
  const dirty =
    draft.code !== problem.code ||
    draft.notes !== problem.notes ||
    draft.language !== problem.language;
  function requestClose() {
    if (saveLock.current) return;
    if (dirty && !confirm('代码或笔记尚未保存，确定放弃修改吗？')) return;
    close();
  }
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  async function save() {
    if (saveLock.current) return;
    saveLock.current = true;
    const snapshot = { ...currentDraft.current };
    setSaving(true);
    setMessage('');
    try {
      const r = await fetch('/api/leetcode', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot),
      });
      if (!r.ok) throw new Error('保存失败，请重试');
      const result = (await r.json()) as Problem;
      if (
        currentDraft.current.code === snapshot.code &&
        currentDraft.current.notes === snapshot.notes &&
        currentDraft.current.language === snapshot.language
      ) {
        saved(result);
      } else {
        setMessage('已保存提交时的版本；后续修改仍需保存');
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '保存失败，请重试');
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && requestClose()}
    >
      <div
        className="modal code-notebook"
        role="dialog"
        aria-modal="true"
        aria-labelledby="code-title"
      >
        <button
          className="modal-close"
          onClick={requestClose}
          disabled={saving}
          aria-label="关闭代码与笔记"
        >
          <X />
        </button>
        <p className="eyebrow">LEETCODE NOTEBOOK · #{problem.order_no}</p>
        <h2 id="code-title">{problem.title}</h2>
        <div className="notebook-meta">
          <span className="tag">{problem.category}</span>
          <span className={`difficulty ${problem.difficulty}`}>
            {problem.difficulty}
          </span>
          <label>
            语言
            <select
              className="form-select"
              value={draft.language}
              onChange={(e) => setDraft({ ...draft, language: e.target.value })}
            >
              {[
                'JavaScript',
                'TypeScript',
                'Python',
                'Java',
                'C++',
                'Go',
                'Rust',
                'SQL',
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="code-field">
          <div className="code-field-head">
            <strong>代码</strong>
            <span>Tab 缩进 · 自动闭合 · 变量补全 · Ctrl/⌘ + S 保存</span>
          </div>
          <Suspense
            fallback={<div className="editor-loading">正在加载代码编辑器…</div>}
          >
            <CodeEditor
              language={draft.language}
              value={draft.code}
              onChange={(code) => setDraft((current) => ({ ...current, code }))}
              onSave={save}
            />
          </Suspense>
        </div>
        <label className="notes-field">
          灵活笔记
          <textarea
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            placeholder="记录思路、复杂度、易错点、复习提醒……"
          />
        </label>
        {message && <p className="form-error">{message}</p>}
        <div className="notebook-actions">
          <span>代码和笔记仅属于当前账号</span>
          <Button onClick={save} disabled={saving}>
            <Save />
            {saving ? '正在保存…' : '保存代码与笔记'}
          </Button>
        </div>
      </div>
    </div>
  );
}
function Header({
  internships,
  contacts,
  solved,
  accountName,
  isAdmin,
}: {
  internships: number;
  contacts: number;
  solved: number;
  accountName: string;
  isAdmin: boolean;
}) {
  return (
    <>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Sparkles />
          </div>
          <div>
            <strong>成长坐标</strong>
            <span>MY GROWTH ARCHIVE</span>
          </div>
        </div>
        <p className="top-quote">“把走过的路，变成继续前行的底气。”</p>
        <div className="account-menu">
          <div className="avatar">{accountName[0]?.toUpperCase()}</div>
          <span>{accountName}</span>
          {isAdmin && <a className="account-settings-link" href="/admin">管理端</a>}
          <a className="account-settings-link" href="/account" title="设置或修改登录密码">账号设置</a>
          <a className="account-settings-link" href="/register">注册</a>
          <LogoutButton />
        </div>
      </header>
      <section className="hero compact">
        <div>
          <p className="eyebrow">PERSONAL GROWTH SYSTEM · {accountName}</p>
          <h1>
            记录经历，<em>看见成长。</em>
          </h1>
          <p className="hero-copy">
            实习、人脉、算法、基础知识、笔记与面试资料，都在同一个坐标系里持续积累。
          </p>
        </div>
        <div className="stats">
          <div>
            <span>{internships}</span>
            <small>段实习</small>
          </div>
          <i />
          <div>
            <span>{contacts}</span>
            <small>位同行者</small>
          </div>
          <i />
          <div>
            <span>{solved}</span>
            <small>题已掌握</small>
          </div>
        </div>
      </section>
    </>
  );
}
function Heading({
  no,
  en,
  title,
  copy,
  children,
}: {
  no: string;
  en: string;
  title: string;
  copy: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <span>
          {no} / {en}
        </span>
        <h2>{title}</h2>
        <p>{copy}</p>
      </div>
      {children}
    </div>
  );
}
function Empty() {
  return <div className="empty-card">正在打开成长档案…</div>;
}
function NetworkGraph({
  contacts,
  edit,
}: {
  contacts: Contact[];
  edit: (x: Contact) => void;
}) {
  const shown = contacts.slice(0, 30),
    pos = shown.map((c) => {
      const r = c.closeness || 2,
        peers = shown.filter((x) => (x.closeness || 2) === r),
        i = peers.findIndex((x) => x.id === c.id),
        a = (i / Math.max(peers.length, 1)) * Math.PI * 2 - Math.PI / 2,
        rad = [0, 135, 235, 335][r];
      return { c, x: 450 + Math.cos(a) * rad, y: 390 + Math.sin(a) * rad };
    });
  return (
    <div className="graph-scroll">
      <div className="graph-canvas">
        <svg viewBox="0 0 900 780">
          <circle cx="450" cy="390" r="135" />
          <circle cx="450" cy="390" r="235" />
          <circle cx="450" cy="390" r="335" />
          {pos.map((p) => (
            <line key={p.c.id} x1="450" y1="390" x2={p.x} y2={p.y} />
          ))}
        </svg>
        <div className="graph-labels">
          <span>核心</span>
          <span>常联系</span>
          <span>认识</span>
        </div>
        <div className="graph-me">
          <span>我</span>
          <strong>成长坐标</strong>
        </div>
        {pos.map((p) => (
          <button
            key={p.c.id}
            className={`graph-node ring-${p.c.closeness || 2}`}
            style={{ left: p.x, top: p.y }}
            onClick={() => edit(p.c)}
          >
            <span>{p.c.name[0]}</span>
            <strong>{p.c.name}</strong>
            <small>{p.c.relationship}</small>
            <Edit3 />
          </button>
        ))}
      </div>
    </div>
  );
}
function Editor(p: {
  modal: Exclude<Modal, null>;
  editing: boolean;
  close: () => void;
  submit: (e: FormEvent) => void;
  saving: boolean;
  error: string;
  iForm: typeof emptyI;
  setIForm: (x: typeof emptyI) => void;
  cForm: typeof emptyC;
  setCForm: (x: typeof emptyC) => void;
  fForm: typeof emptyF;
  setFForm: (x: typeof emptyF) => void;
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && p.close()}
    >
      <div className="modal" role="dialog" aria-modal="true">
        <button className="modal-close" onClick={p.close}>
          <X />
        </button>
        <p className="eyebrow">{p.editing ? 'EDIT RECORD' : 'NEW RECORD'}</p>
        <h2>
          {p.editing ? '编辑' : '添加'}
          {p.modal === 'internship'
            ? '实习记录'
            : p.modal === 'contact'
              ? '人脉节点'
              : '知识点'}
        </h2>
        <form onSubmit={p.submit}>
          {p.modal === 'internship' ? (
            <>
              <label>
                公司 / 组织
                <Input
                  required
                  value={p.iForm.company}
                  onChange={(e) =>
                    p.setIForm({ ...p.iForm, company: e.target.value })
                  }
                />
              </label>
              <div className="form-row">
                <label>
                  岗位
                  <Input
                    required
                    value={p.iForm.role}
                    onChange={(e) =>
                      p.setIForm({ ...p.iForm, role: e.target.value })
                    }
                  />
                </label>
                <label>
                  实习时间
                  <Input
                    value={p.iForm.period}
                    onChange={(e) =>
                      p.setIForm({ ...p.iForm, period: e.target.value })
                    }
                  />
                </label>
              </div>
              <label>
                核心收获
                <Textarea
                  required
                  rows={4}
                  value={p.iForm.summary}
                  onChange={(e) =>
                    p.setIForm({ ...p.iForm, summary: e.target.value })
                  }
                />
              </label>
              <label>
                高光时刻
                <Textarea
                  rows={3}
                  value={p.iForm.highlights}
                  onChange={(e) =>
                    p.setIForm({ ...p.iForm, highlights: e.target.value })
                  }
                />
              </label>
            </>
          ) : p.modal === 'contact' ? (
            <>
              <div className="form-row">
                <label>
                  姓名
                  <Input
                    required
                    value={p.cForm.name}
                    onChange={(e) =>
                      p.setCForm({ ...p.cForm, name: e.target.value })
                    }
                  />
                </label>
                <label>
                  与我的关系
                  <Input
                    required
                    value={p.cForm.relationship}
                    onChange={(e) =>
                      p.setCForm({ ...p.cForm, relationship: e.target.value })
                    }
                  />
                </label>
              </div>
              <label>
                TA 对我的作用
                <Textarea
                  required
                  rows={3}
                  value={p.cForm.value}
                  onChange={(e) =>
                    p.setCForm({ ...p.cForm, value: e.target.value })
                  }
                />
              </label>
              <label>
                TA 的方向
                <Input
                  required
                  value={p.cForm.direction}
                  onChange={(e) =>
                    p.setCForm({ ...p.cForm, direction: e.target.value })
                  }
                />
              </label>
              <label>
                关系距离
                <select
                  className="form-select"
                  value={p.cForm.closeness}
                  onChange={(e) =>
                    p.setCForm({
                      ...p.cForm,
                      closeness: Number(e.target.value),
                    })
                  }
                >
                  <option value={1}>核心关系 · 最近</option>
                  <option value={2}>常联系 · 中等</option>
                  <option value={3}>认识 · 较远</option>
                </select>
              </label>
            </>
          ) : (
            <>
              <div className="form-row">
                <label>
                  领域
                  <select
                    className="form-select"
                    value={p.fForm.area}
                    onChange={(e) =>
                      p.setFForm({ ...p.fForm, area: e.target.value })
                    }
                  >
                    {[
                      '计算机网络',
                      '操作系统',
                      '数据库',
                      '计算机组成',
                      '其他',
                    ].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label>
                  知识点
                  <Input
                    required
                    value={p.fForm.topic}
                    onChange={(e) =>
                      p.setFForm({ ...p.fForm, topic: e.target.value })
                    }
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  学习状态
                  <select
                    className="form-select"
                    value={p.fForm.status}
                    onChange={(e) =>
                      p.setFForm({ ...p.fForm, status: e.target.value })
                    }
                  >
                    {['待学习', '学习中', '已掌握', '需复习'].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label>
                  最近复习
                  <Input
                    type="date"
                    value={p.fForm.last_reviewed}
                    onChange={(e) =>
                      p.setFForm({ ...p.fForm, last_reviewed: e.target.value })
                    }
                  />
                </label>
              </div>
              <label>
                掌握度：{p.fForm.confidence}%
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={p.fForm.confidence}
                  onChange={(e) =>
                    p.setFForm({
                      ...p.fForm,
                      confidence: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                笔记
                <Textarea
                  rows={3}
                  value={p.fForm.notes}
                  onChange={(e) =>
                    p.setFForm({ ...p.fForm, notes: e.target.value })
                  }
                />
              </label>
            </>
          )}
          {p.error && <p className="form-error">{p.error}</p>}
          <Button type="submit" size="lg" disabled={p.saving}>
            {p.saving ? '正在保存…' : '保存记录'}
            <ArrowUpRight />
          </Button>
        </form>
      </div>
    </div>
  );
}
