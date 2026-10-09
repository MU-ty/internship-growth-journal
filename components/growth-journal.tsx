'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ArrowUpRight, BriefcaseBusiness, Compass, Edit3, Plus, Sparkles, Trash2, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type Internship = { id: number; company: string; role: string; period: string; summary: string; highlights: string };
type Contact = { id: number; name: string; relationship: string; value: string; direction: string };
type Mode = 'internship' | 'contact' | null;

const emptyInternship = { company: '', role: '', period: '', summary: '', highlights: '' };
const emptyContact = { name: '', relationship: '', value: '', direction: '' };

export function GrowthJournal() {
  const [tab, setTab] = useState<'internships' | 'network'>('internships');
  const [internships, setInternships] = useState<Internship[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [mode, setMode] = useState<Mode>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [internshipForm, setInternshipForm] = useState(emptyInternship);
  const [contactForm, setContactForm] = useState(emptyContact);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function refresh() {
    try {
      const [i, c] = await Promise.all([fetch('/api/internships'), fetch('/api/contacts')]);
      if (!i.ok || !c.ok) throw new Error('加载失败');
      setInternships(await i.json());
      setContacts(await c.json());
    } catch { setError('暂时无法读取数据，请稍后重试。'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);

  function openInternship(item?: Internship) {
    setMode('internship'); setEditingId(item?.id ?? null); setError('');
    setInternshipForm(item ? { company: item.company, role: item.role, period: item.period, summary: item.summary, highlights: item.highlights } : emptyInternship);
  }
  function openContact(item?: Contact) {
    setMode('contact'); setEditingId(item?.id ?? null); setError('');
    setContactForm(item ? { name: item.name, relationship: item.relationship, value: item.value, direction: item.direction } : emptyContact);
  }
  function closeModal() { setMode(null); setEditingId(null); setError(''); }

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    const endpoint = mode === 'internship' ? '/api/internships' : '/api/contacts';
    const body = mode === 'internship' ? internshipForm : contactForm;
    try {
      const response = await fetch(endpoint, { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, id: editingId }) });
      if (!response.ok) { const data = await response.json() as { error?: string }; throw new Error(data.error || '保存失败'); }
      await refresh(); closeModal();
    } catch (reason) { setError(reason instanceof Error ? reason.message : '保存失败'); }
    finally { setSaving(false); }
  }

  async function remove(type: 'internships' | 'contacts', id: number) {
    if (!confirm('确定要删除这条记录吗？')) return;
    await fetch(`/api/${type}?id=${id}`, { method: 'DELETE' });
    await refresh();
  }

  return (
    <main className="min-h-screen">
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><Sparkles /></div><div><strong>实习收获簿</strong><span>MY GROWTH ARCHIVE</span></div></div>
        <p className="top-quote">“把走过的路，变成继续前行的底气。”</p>
        <div className="avatar">我</div>
      </header>

      <section className="hero">
        <div><p className="eyebrow">PERSONAL GROWTH JOURNAL</p><h1>记录经历，<em>沉淀成长。</em></h1><p className="hero-copy">每一段实习都值得被认真回望，每一次相遇都可能成为未来的坐标。</p></div>
        <div className="stats"><div><span>{internships.length.toString().padStart(2, '0')}</span><small>段实习经历</small></div><i /><div><span>{contacts.length.toString().padStart(2, '0')}</span><small>位同行者</small></div></div>
      </section>

      <nav className="tabs" aria-label="内容切换">
        <button className={tab === 'internships' ? 'active' : ''} onClick={() => setTab('internships')}><BriefcaseBusiness />实习收获</button>
        <button className={tab === 'network' ? 'active' : ''} onClick={() => setTab('network')}><Users />人脉网络</button>
      </nav>

      {tab === 'internships' ? (
        <section className="content-section">
          <div className="section-heading"><div><span>01 / EXPERIENCE</span><h2>我的实习足迹</h2><p>把项目、方法与思考，整理成属于自己的经验库。</p></div><Button size="lg" onClick={() => openInternship()}><Plus />记录一段实习</Button></div>
          {loading ? <div className="empty-card">正在打开你的成长档案…</div> : internships.length === 0 ? (
            <button className="empty-card clickable" onClick={() => openInternship()}><div className="empty-icon"><BriefcaseBusiness /></div><strong>从第一段实习开始记录</strong><span>写下公司、岗位、核心收获与值得记住的瞬间</span><b><Plus />添加实习记录</b></button>
          ) : <div className="experience-grid">{internships.map((item, index) => <article className="experience-card" key={item.id}><div className="card-number">{String(index + 1).padStart(2, '0')}</div><div className="card-actions"><button aria-label="编辑" onClick={() => openInternship(item)}><Edit3 /></button><button aria-label="删除" onClick={() => remove('internships', item.id)}><Trash2 /></button></div><span className="period">{item.period || '时间待补充'}</span><h3>{item.company}</h3><p className="role">{item.role}</p><p className="summary">{item.summary}</p>{item.highlights && <div className="highlights"><Sparkles />{item.highlights}</div>}</article>)}</div>}
        </section>
      ) : (
        <section className="content-section">
          <div className="section-heading"><div><span>02 / CONNECTIONS</span><h2>我的同行者</h2><p>看见彼此的方向，也记住每段关系带来的力量。</p></div><Button size="lg" onClick={() => openContact()}><Plus />添加一位同行者</Button></div>
          <div className="network-stage">
            <div className="network-center"><div className="center-ring"><span>我</span></div><strong>我的成长坐标</strong><small>中心节点</small></div>
            {contacts.length === 0 ? <button className="network-empty" onClick={() => openContact()}><Plus /><strong>添加第一位同行者</strong><span>姓名 · 关系 · 作用 · 方向</span></button> : <div className="contact-orbit">{contacts.map((person, index) => <article className={`contact-node node-${index % 6}`} key={person.id}><div className="node-head"><span>{person.name.slice(0, 1)}</span><div><h3>{person.name}</h3><p>{person.relationship}</p></div></div><dl><div><dt>带给我的作用</dt><dd>{person.value}</dd></div><div><dt><Compass />TA 的方向</dt><dd>{person.direction}</dd></div></dl><div className="node-actions"><button onClick={() => openContact(person)}>编辑</button><button onClick={() => remove('contacts', person.id)}>删除</button></div></article>)}</div>}
          </div>
        </section>
      )}

      <footer><span>GROW · CONNECT · BECOME</span><p>所有经历都在成为你的一部分。</p><ArrowUpRight /></footer>

      {mode && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && closeModal()}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" aria-label="关闭" onClick={closeModal}><X /></button><p className="eyebrow">{editingId ? 'EDIT RECORD' : 'NEW RECORD'}</p><h2 id="modal-title">{editingId ? '编辑' : '添加'}{mode === 'internship' ? '实习记录' : '同行者'}</h2><form onSubmit={submit}>
        {mode === 'internship' ? <>
          <label>公司 / 组织<Input required placeholder="例如：某某科技" value={internshipForm.company} onChange={e => setInternshipForm({ ...internshipForm, company: e.target.value })} /></label>
          <div className="form-row"><label>岗位<Input required placeholder="产品实习生" value={internshipForm.role} onChange={e => setInternshipForm({ ...internshipForm, role: e.target.value })} /></label><label>实习时间<Input placeholder="2026.06 — 2026.09" value={internshipForm.period} onChange={e => setInternshipForm({ ...internshipForm, period: e.target.value })} /></label></div>
          <label>核心收获<Textarea required rows={4} placeholder="这段经历让我学会了……" value={internshipForm.summary} onChange={e => setInternshipForm({ ...internshipForm, summary: e.target.value })} /></label>
          <label>高光时刻 / 关键成果<Textarea rows={3} placeholder="完成了什么，收到了怎样的反馈？" value={internshipForm.highlights} onChange={e => setInternshipForm({ ...internshipForm, highlights: e.target.value })} /></label>
        </> : <>
          <div className="form-row"><label>姓名<Input required placeholder="对方姓名" value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} /></label><label>与我的关系<Input required placeholder="导师 / 同事 / 伙伴" value={contactForm.relationship} onChange={e => setContactForm({ ...contactForm, relationship: e.target.value })} /></label></div>
          <label>TA 对我的作用<Textarea required rows={3} placeholder="例如：给我专业建议，帮我打开视野……" value={contactForm.value} onChange={e => setContactForm({ ...contactForm, value: e.target.value })} /></label>
          <label>TA 的方向<Input required placeholder="例如：AI 产品、品牌营销、金融科技" value={contactForm.direction} onChange={e => setContactForm({ ...contactForm, direction: e.target.value })} /></label>
        </>}
        {error && <p className="form-error">{error}</p>}<Button size="lg" disabled={saving} type="submit">{saving ? '正在保存…' : '保存记录'}<ArrowUpRight /></Button>
      </form></div></div>}
    </main>
  );
}
