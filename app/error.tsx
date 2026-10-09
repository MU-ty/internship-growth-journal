'use client';
export default function SiteError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <h1>暂时无法打开收获簿</h1>
        <p className="auth-description">
          读取服务暂时不可用，请重试。这个错误页面不会修改你的记录。
        </p>
        <button type="button" className="auth-alternative" onClick={reset}>
          重新加载
        </button>
        <a className="auth-back" href="/login">
          返回登录页
        </a>
      </section>
    </main>
  );
}
