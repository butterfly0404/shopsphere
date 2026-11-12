import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth, useCart } from '../context/AppContext';
import { CartIcon, SearchIcon, UserIcon } from './Icons';

export function Logo() {
  return (
    <Link to="/" className="logo">
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="14" fill="var(--primary)" />
        <ellipse cx="16" cy="16" rx="14" ry="5" fill="none" stroke="white" strokeWidth="2" />
      </svg>
      <span>Shop<b>Sphere</b></span>
    </Link>
  );
}

function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const search = (e) => {
    e.preventDefault();
    navigate(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : '/shop');
  };

  return (
    <header className="navbar">
      <div className="container nav-inner">
        <Logo />
        <nav className="nav-links">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/shop">Shop</NavLink>
          {user && <NavLink to="/orders">My Orders</NavLink>}
          {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <form className="nav-search" onSubmit={search}>
          <SearchIcon />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" aria-label="Search products" />
        </form>
        <div className="nav-actions">
          {user ? (
            <div className="nav-user">
              <span className="avatar">{user.name.charAt(0).toUpperCase()}</span>
              <span className="nav-user-name">{user.name.split(' ')[0]}</span>
              <button className="link-btn" onClick={logout}>Logout</button>
            </div>
          ) : (
            <Link to="/login" className="icon-link"><UserIcon /> <span>Login</span></Link>
          )}
          <Link to="/cart" className="icon-link cart-link" aria-label="Cart">
            <CartIcon />
            {count > 0 && <span className="cart-count">{count}</span>}
          </Link>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const [health, setHealth] = useState(null);
  useEffect(() => {
    api('/health').then(setHealth).catch(() => setHealth({ status: 'down' }));
  }, []);

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <Logo />
          <p className="muted">Quality products, honest prices, delivered across India.</p>
        </div>
        <div className="footer-links">
          <Link to="/shop">All products</Link>
          <Link to="/cart">Cart</Link>
          <Link to="/orders">Track orders</Link>
        </div>
        {/* Deployment info: proves which build and which Kubernetes pod served the page */}
        <div className="deploy-info" title="Deployment information">
          <span className="deploy-title">
            <span className={`dot ${health?.status === 'ok' ? 'dot-ok' : 'dot-bad'}`} />
            {health?.status === 'ok' ? 'Live deployment' : 'Checking deployment…'}
          </span>
          <span>Version <b>{health?.version || '…'}</b></span>
          <span>Pod <code>{health?.pod || '…'}</code></span>
          <span>Database {health?.db || '…'}</span>
        </div>
      </div>
      <div className="container footer-bottom muted">© {new Date().getFullYear()} ShopSphere · DevOps project: Git · Jenkins · Docker · Kubernetes</div>
    </footer>
  );
}

export default function Layout() {
  return (
    <>
      <Navbar />
      <main className="main"><Outlet /></main>
      <Footer />
    </>
  );
}
