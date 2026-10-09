'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export function RegistrationControl() {
  const [status, setStatus] = useState<{ enabled: boolean; updatedAt: number | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError(''); setStatus(null);
    fetch('/api/admin/registration', { cache: 'no-store', signal: controller.signal }).then(async response => {
      const body = await response.json() as { enabled: boolean; updatedAt: number | null; error?: string };
      if (!response.ok) throw new Error(body.error || '无法读取注册状态');
      if (!controller.signal.aborted) setStatus(body);
    }).catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [retry]);
  async function toggle() {
    if (!status || busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/admin/registration', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !status.enabled }) });
      const body = await response.json() as { enabled: boolean; updatedAt: number | null; error?: string };
      if (!response.ok) throw new Error(body.error || '保存失败，请重试');
      setStatus(body); setMessage(body.enabled ? '注册已开启' : '注册已暂停，已有账号不受影响');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '无法保存注册状态');
      // A lost response may still have committed. Reload before allowing another change.
      setStatus(null);
    } finally { setBusy(false); }
  }
  return <section className="admin-panel admin-registration"><div className="admin-panel-heading"><div><h2>新账号注册 <span className="admin-badge">{status ? status.enabled ? '已开启' : '已暂停' : '待确认'}</span></h2><p>暂停后禁止新账号注册，已有账号仍可登录和使用。</p></div><Button className="admin-button" disabled={busy || !status} onClick={toggle}>{busy ? '正在保存…' : status?.enabled ? '暂停注册' : '开启注册'}</Button></div>
    {status?.updatedAt && <p className="admin-help">最近设置：{new Date(status.updatedAt).toLocaleString('zh-CN', { hour12: false })}</p>}
    <div aria-live="polite">{message && <p className="admin-help" role="status">{message}</p>}{error && <div><p className="auth-error" role="alert">{error}</p><Button className="admin-button" onClick={() => setRetry(value => value + 1)}>重新读取状态</Button></div>}{!status && !error && <p className="admin-help">正在读取注册状态…</p>}</div>
  </section>;
}
