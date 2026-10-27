import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useAuth, type User } from '../lib/auth';
import { useHead } from '../lib/head';

const safeNext = (n: string | null) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/account');

function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { setUser } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', display_name: '' });
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  useHead(mode === 'login' ? 'Sign in' : 'Create account', { noindex: true });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api.post<{ user: User }>(`/api/auth/${mode}`, mode === 'login' ? { email: form.email, password: form.password } : form);
      setUser(r.user);
      nav(safeNext(sp.get('next')));
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setBusy(false);
    }
  };
  const upd = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  return (
    <form className="panel panel-pad" style={{ maxWidth: 420, margin: '20px auto' }} onSubmit={submit}>
      <h1>{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
      <p className="small muted">An account is optional. It saves bookmarks, practice history, test attempts and progress. All questions are readable without signing in.</p>
      {mode === 'register' && <label className="field"><span>Name</span><input type="text" required maxLength={80} value={form.display_name} onChange={upd('display_name')} autoComplete="name" /></label>}
      <label className="field"><span>Email</span><input type="email" required value={form.email} onChange={upd('email')} autoComplete="email" /></label>
      <label className="field"><span>Password</span><input type="password" required minLength={8} value={form.password} onChange={upd('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
      {error && <div className="errors" role="alert">{error.message}{error.details?.map((d, i) => <div key={i}>{d.path}: {d.message}</div>)}</div>}
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        {mode === 'login' ? <Link to={`/register?${sp}`}>Create an account</Link> : <Link to={`/login?${sp}`}>I already have an account</Link>}
      </div>
    </form>
  );
}

export const LoginPage = () => <AuthForm mode="login" />;
export const RegisterPage = () => <AuthForm mode="register" />;
