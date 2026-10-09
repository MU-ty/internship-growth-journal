'use client';
import { FormEvent, useEffect, useState } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthFrame } from '@/components/auth-frame';

export function RegisterForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState('');
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(null);
  const [statusError, setStatusError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setStatusError('');
    fetch('/api/auth/register', { cache: 'no-store', signal: controller.signal }).then(async response => {
      const body = await response.json() as { enabled?: boolean };
      if (!response.ok || typeof body.enabled !== 'boolean') throw new Error('暂时无法读取注册状态，请重试');
      if (!controller.signal.aborted) setRegistrationEnabled(body.enabled);
    }).catch(() => { if (!controller.signal.aborted) setStatusError('暂时无法读取注册状态，请重试'); });
    return () => controller.abort();
  }, [retry]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || registrationEnabled !== true) return;
    setError('');
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, confirmPassword }),
      });
      const result = (await response.json()) as {
        error?: string;
        username?: string;
        registrationPaused?: boolean;
      };
      if (result.registrationPaused) setRegistrationEnabled(false);
      if (!response.ok) throw new Error(result.error || '注册失败，请重试');
      setRegistered(result.username || username.trim().toLowerCase());
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      setError(error instanceof Error ? error.message : '无法连接，请稍后再试');
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthFrame mode="register">
        <p className="auth-eyebrow">YOUR OWN GROWTH ARCHIVE</p>
        <h1>{registered ? '注册成功' : '开启你的成长档案'}</h1>
        {registered ? (
          <div className="auth-success" role="status">
            <ShieldCheck />
            <p>
              账号「{registered}
              」已创建。现在可以用刚设置的密码登录，你的数据会与其他账号独立保存。
            </p>
            <a href="/login" className="auth-alternative">
              前往登录
            </a>
          </div>
        ) : (
          <>
            <p className="auth-description">
              无需 OpenAI 账号，设置账号和密码即可注册。
            </p>
            {statusError && <div><p className="auth-error" role="alert">{statusError}</p><Button type="button" variant="outline" onClick={() => setRetry(value => value + 1)}>重新读取状态</Button></div>}
            {!statusError && registrationEnabled === null && <p className="auth-hint" role="status">正在确认注册状态…</p>}
            {registrationEnabled === false ? <div className="auth-registration-notice" role="status"><strong>注册已暂停</strong><p>暂时不接受新账号注册，请稍后再来。已有账号仍可正常登录。</p><Button type="button" variant="outline" onClick={() => setRetry(value => value + 1)}>刷新状态</Button></div> :
            <form className="auth-form" onSubmit={submit}>
              <label htmlFor="register-user">账号</label>
              <Input
                id="register-user"
                name="username"
                autoComplete="username"
                placeholder="为自己取一个账号名"
                autoCapitalize="none"
                spellCheck={false}
                minLength={3}
                maxLength={32}
                pattern="[a-zA-Z0-9]([a-zA-Z0-9_]|-){2,31}"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={busy}
              />
              <p className="auth-hint">
                3–32
                位字母、数字、下划线或短横线；不区分大小写。账号创建后不可修改。
              </p>
              <label htmlFor="register-password">密码</label>
              <div className="auth-password">
                <Input
                  id="register-password"
                  name="password"
                  type={visible ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="设置至少 12 个字符的密码"
                  minLength={12}
                  maxLength={128}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={visible ? '隐藏密码' : '显示密码'}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              <p className="auth-hint">
                至少 12 个字符，推荐使用不在其他网站使用的较长短语。
              </p>
              <label htmlFor="register-confirm">确认密码</label>
              <Input
                id="register-confirm"
                name="confirmPassword"
                type={visible ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="再次输入密码"
                minLength={12}
                maxLength={128}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={busy}
              />
              <p className="auth-registration-notice">
                暂不使用邮箱验证，也不支持邮箱找回密码。请用密码管理器保存账号和密码。
              </p>
              {error && (
                <p className="auth-error" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="auth-primary" disabled={busy || registrationEnabled !== true}>
                {busy ? '正在注册…' : '注册账号'}
              </Button>
            </form>}
            <p className="auth-register-link">
              已有账号？<a href="/login">直接登录</a>
            </p>
          </>
        )}
    </AuthFrame>
  );
}
