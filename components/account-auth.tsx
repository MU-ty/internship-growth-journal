'use client';

import { FormEvent, useState } from 'react';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthFrame } from '@/components/auth-frame';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || '登录失败，请重试');
      window.location.assign('/');
    } catch (error) {
      setError(error instanceof Error ? error.message : '无法连接，请稍后再试');
      setBusy(false);
    }
  }
  return (
    <AuthFrame mode="login">
        <p className="auth-eyebrow">WELCOME BACK</p>
        <h1>欢迎回来</h1>
        <p className="auth-description">用账号密码登录，打开自己的成长档案。</p>
        <form onSubmit={submit} className="auth-form">
          <label htmlFor="login-user">账号</label>
          <Input
            id="login-user"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="输入你的账号"
            maxLength={32}
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={busy}
          />
          <label htmlFor="login-password">密码</label>
          <div className="auth-password">
            <Input
              id="login-password"
              name="password"
              type={visible ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="输入密码"
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
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="auth-primary" disabled={busy}>
            {busy ? '正在登录…' : '账号密码登录'}
          </Button>
        </form>
        <p className="auth-register-link">
          还没有账号？<a href="/register">注册账号</a>
        </p>
        <div className="auth-divider">
          <span>其他登录方式</span>
        </div>
        <a
          className="auth-alternative"
          href="/signin-with-chatgpt?return_to=%2F"
          target="_top"
        >
          使用 OpenAI 登录
        </a>
        <div className="auth-help">
          <KeyRound />
          <p>
            原 OpenAI 账号的用户：
            <a href="/signin-with-chatgpt?return_to=%2Faccount" target="_top">
              可用原登录方式设置或重设密码
            </a>
            ，两种方式访问同一份数据。
          </p>
        </div>
    </AuthFrame>
  );
}

export function PasswordSettings({
  accountName,
  username: initialUsername,
  configured,
  needsCurrentPassword,
  canRecoverWithOpenAI = true,
}: {
  accountName: string;
  username: string;
  configured: boolean;
  needsCurrentPassword: boolean;
  canRecoverWithOpenAI?: boolean;
}) {
  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (password !== confirm) {
      setError('两次输入的密码不一致');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, currentPassword }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || '密码保存失败');
      setPassword('');
      setConfirm('');
      setCurrentPassword('');
      setSaved(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : '无法连接，请稍后再试');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <a className="auth-back" href="/">
          <ArrowLeft />
          返回收获簿
        </a>
        <div className="auth-brand">
          <ShieldCheck />
          <span>账号安全</span>
        </div>
        <h1>{configured ? '修改登录密码' : '设置账号密码'}</h1>
        <p className="auth-description">
          当前账号：{accountName}。设置后，你的所有原有记录保持不变。
        </p>
        {saved ? (
          <div className="auth-success" role="status">
            <ShieldCheck />
            <h2>密码已保存</h2>
            <p>
              以后可使用账号「{username}
              」和刚设置的密码登录。其他设备上的密码登录已退出。
            </p>
            <a className="auth-alternative" href="/">
              返回收获簿
            </a>
          </div>
        ) : (
          <form onSubmit={submit} className="auth-form">
            <label htmlFor="settings-user">登录账号</label>
            <Input
              id="settings-user"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              minLength={3}
              maxLength={32}
              pattern="[a-zA-Z0-9]([a-zA-Z0-9_]|-){2,31}"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={configured || initialUsername === 'mty' || busy}
            />
            <p className="auth-hint">
              账号绑定后不可修改；可使用字母、数字、下划线和短横线。
            </p>
            {needsCurrentPassword && (
              <>
                <label htmlFor="settings-current">当前密码</label>
                <Input
                  id="settings-current"
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={128}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={busy}
                />
              </>
            )}
            <label htmlFor="settings-password">
              {configured ? '新密码' : '密码'}
            </label>
            <div className="auth-password">
              <Input
                id="settings-password"
                type={visible ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
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
              至少 12 个字符。推荐使用较长、容易记住且不在其他网站使用的短语。
            </p>
            <label htmlFor="settings-confirm">再次输入密码</label>
            <Input
              id="settings-confirm"
              type={visible ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={busy}
            />
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="auth-primary" disabled={busy}>
              {busy
                ? '正在保存…'
                : configured
                  ? '保存新密码'
                  : '开启账号密码登录'}
            </Button>
            {needsCurrentPassword && canRecoverWithOpenAI && (
              <a
                className="auth-hint"
                href="/signin-with-chatgpt?return_to=%2Faccount"
                target="_top"
              >
                忘记当前密码？使用原来的 OpenAI 账号重设
              </a>
            )}
            {!canRecoverWithOpenAI && (
              <p className="auth-hint">
                独立注册账号暂不支持邮箱或 OpenAI 找回密码，请妥善保存。
              </p>
            )}
          </form>
        )}
      </section>
    </main>
  );
}

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function logout() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!response.ok) throw new Error('退出失败，请重试');
      window.location.assign('/signout-with-chatgpt?return_to=%2Flogin');
    } catch {
      setError('退出失败，请重试');
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        title="退出登录"
        aria-label="退出登录"
        onClick={logout}
        disabled={busy}
      >
        <LogOut />
      </button>
      {error && <span role="alert">{error}</span>}
    </>
  );
}
