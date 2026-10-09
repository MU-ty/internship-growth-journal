import type { ReactNode } from 'react';
import { Sparkles, BookOpen, Code2, BriefcaseBusiness } from 'lucide-react';

export function AuthFrame({ mode, children }: { mode: 'login' | 'register'; children: ReactNode }) {
  return <main className={`auth-shell auth-entry auth-entry-${mode}`}>
    <div className="auth-layout">
      <aside className="auth-story">
        <div className="auth-story-brand"><span className="auth-brand-mark"><Sparkles size={22}/></span><div>成长坐标<small>MY GROWTH ARCHIVE</small></div></div>
        <div className="auth-story-content"><p className="auth-story-kicker">实习收获簿 · 你的成长档案</p><h2>每一步积累，<br/>都有自己的<br/><em>坐标。</em></h2><p className="auth-story-description">从第一次实习，到下一次出发。<br/>把经验留下，把成长看见。</p>
          <div className="auth-story-features"><span><BookOpen size={17}/>珍藏笔记与灵感</span><span><Code2 size={17}/>沉淀代码与思考</span><span><BriefcaseBusiness size={17}/>记录面试与实习</span></div>
        </div>
        <div className="auth-story-bottom"><span>记录当下 · 积累未来</span><span>GROW AT YOUR PACE</span></div>
      </aside>
      <section className="auth-card">
        <nav className="auth-mode-nav" aria-label="账号入口"><a href="/login" aria-current={mode === 'login' ? 'page' : undefined}>登录</a><a href="/register" aria-current={mode === 'register' ? 'page' : undefined}>注册</a></nav>
        <div className="auth-form-content">{children}</div>
        <p className="auth-entry-footer">属于你的记录，值得好好珍藏。</p>
      </section>
    </div>
  </main>;
}
