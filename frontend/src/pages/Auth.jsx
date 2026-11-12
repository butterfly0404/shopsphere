import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, useToast } from '../context/AppContext';
import { Logo } from '../components/Layout';

function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <Logo />
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
        {children}
        <p className="auth-foot muted">{footer}</p>
      </div>
    </div>
  );
}

function useAfterAuth() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  return (user) => navigate(params.get('next') || (user.role === 'admin' ? '/admin' : '/'), { replace: true });
}

export function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const done = useAfterAuth();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const user = await login(email, password);
      toast(`Welcome back, ${user.name.split(' ')[0]}!`);
      done(user);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const next = params.get('next');
  return (
    <AuthCard title="Welcome back" subtitle="Log in to continue shopping"
      footer={<>New to ShopSphere? <Link to={`/register${next ? `?next=${encodeURIComponent(next)}` : ''}`}>Create an account</Link></>}>
      <form className="stack" onSubmit={submit}>
        {error && <div className="alert alert-error">{error}</div>}
        <label>Email<input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
        <label>Password<input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
        <button className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
    </AuthCard>
  );
}

export function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const done = useAfterAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const user = await register(form.name, form.email, form.password);
      toast('Account created. Happy shopping!');
      done(user);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <AuthCard title="Create your account" subtitle="It takes less than a minute"
      footer={<>Already have an account? <Link to="/login">Log in</Link></>}>
      <form className="stack" onSubmit={submit}>
        {error && <div className="alert alert-error">{error}</div>}
        <label>Full name<input className="input" required minLength={2} value={form.name} onChange={set('name')} autoComplete="name" /></label>
        <label>Email<input className="input" type="email" required value={form.email} onChange={set('email')} autoComplete="email" /></label>
        <label>Password<input className="input" type="password" required minLength={6} value={form.password} onChange={set('password')} autoComplete="new-password" placeholder="At least 6 characters" /></label>
        <button className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
    </AuthCard>
  );
}
