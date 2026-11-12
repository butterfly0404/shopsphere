import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, TOKEN_KEY } from '../api';

const AuthCtx = createContext(null);
const CartCtx = createContext(null);
const ToastCtx = createContext(null);

export const useAuth = () => useContext(AuthCtx);
export const useCart = () => useContext(CartCtx);
export const useToast = () => useContext(ToastCtx);

const CART_KEY = 'ss_cart';
const loadCart = () => {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
};

export function AppProvider({ children }) {
  // ---------- toasts ----------
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  // ---------- auth ----------
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) { setAuthReady(true); return; }
    api('/auth/me')
      .then(setUser)
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setAuthReady(true));
  }, []);

  const finishAuth = ({ token, user: u }) => {
    localStorage.setItem(TOKEN_KEY, token);
    setUser(u);
    return u;
  };
  const login = async (email, password) => finishAuth(await api('/auth/login', { method: 'POST', body: { email, password } }));
  const register = async (name, email, password) =>
    finishAuth(await api('/auth/register', { method: 'POST', body: { name, email, password } }));
  const logout = () => { localStorage.removeItem(TOKEN_KEY); setUser(null); toast('Logged out'); };

  // ---------- cart ----------
  const [items, setItems] = useState(loadCart);
  useEffect(() => { localStorage.setItem(CART_KEY, JSON.stringify(items)); }, [items]);

  const cart = useMemo(() => {
    const add = (p, qty = 1) => {
      setItems((cur) => {
        const found = cur.find((i) => i.id === p.id);
        const max = Math.min(p.stock, 20);
        if (found) return cur.map((i) => (i.id === p.id ? { ...i, qty: Math.min(i.qty + qty, max), stock: p.stock } : i));
        return [...cur, { id: p.id, name: p.name, price: p.price, image: p.image, category: p.category, stock: p.stock, qty: Math.min(qty, max) }];
      });
    };
    const update = (id, qty) => setItems((cur) => cur.map((i) => (i.id === id ? { ...i, qty: Math.max(1, Math.min(qty, i.stock, 20)) } : i)));
    const remove = (id) => setItems((cur) => cur.filter((i) => i.id !== id));
    const clear = () => setItems([]);
    const count = items.reduce((s, i) => s + i.qty, 0);
    const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
    const shipping = subtotal === 0 || subtotal >= 999 ? 0 : 49;
    return { items, add, update, remove, clear, count, subtotal, shipping, total: subtotal + shipping };
  }, [items]);

  return (
    <ToastCtx.Provider value={toast}>
      <AuthCtx.Provider value={{ user, authReady, login, register, logout }}>
        <CartCtx.Provider value={cart}>
          {children}
          <div className="toasts">
            {toasts.map((t) => <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>)}
          </div>
        </CartCtx.Provider>
      </AuthCtx.Provider>
    </ToastCtx.Provider>
  );
}
