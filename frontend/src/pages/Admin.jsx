import { useCallback, useEffect, useState } from 'react';
import { api, formatDate, rupees } from '../api';
import { useToast } from '../context/AppContext';
import ProductImage from '../components/ProductImage';

const STATUSES = ['Placed', 'Shipped', 'Delivered', 'Cancelled'];
const EMPTY = { name: '', category: '', price: '', stock: '', image: '', description: '' };

function Dashboard({ stats }) {
  if (!stats) return <div className="spinner" />;
  const max = Math.max(1, ...Object.values(stats.ordersByStatus));
  return (
    <div className="stack">
      <div className="stat-grid">
        <div className="card stat"><span>Revenue</span><b>{rupees(stats.revenue)}</b></div>
        <div className="card stat"><span>Orders</span><b>{stats.orders}</b></div>
        <div className="card stat"><span>Products</span><b>{stats.products}</b></div>
        <div className="card stat"><span>Users</span><b>{stats.customers}</b></div>
      </div>
      <div className="two-col-even">
        <section className="card form-card">
          <h3>Orders by status</h3>
          <div className="bars">
            {STATUSES.map((s) => (
              <div key={s} className="bar-row">
                <span className="bar-label">{s}</span>
                <div className="bar"><span className={`fill-${s}`} style={{ width: `${(stats.ordersByStatus[s] / max) * 100}%` }} /></div>
                <b>{stats.ordersByStatus[s]}</b>
              </div>
            ))}
          </div>
        </section>
        <section className="card form-card">
          <h3>Low stock (5 or fewer)</h3>
          {stats.lowStock.length === 0 ? <p className="muted">All products are well stocked.</p> : (
            <ul className="plain-list">
              {stats.lowStock.map((p) => (
                <li key={p.id}><span>{p.name}</span><span className={`status ${p.stock === 0 ? 'status-Cancelled' : 'status-Placed'}`}>{p.stock} left</span></li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function ProductForm({ initial, onCancel, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(initial ? {
    name: initial.name, category: initial.category, price: String(initial.price), stock: String(initial.stock),
    image: initial.image || '', description: initial.description || '',
  } : EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    const body = { ...form, price: Number(form.price), stock: Number(form.stock) };
    try {
      if (initial) await api(`/admin/products/${initial.id}`, { method: 'PUT', body });
      else await api('/admin/products', { method: 'POST', body });
      toast(initial ? 'Product updated' : 'Product added');
      onSaved();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="card modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <h3>{initial ? 'Edit product' : 'Add product'}</h3>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-grid">
          <label className="span-2">Name<input className="input" required value={form.name} onChange={set('name')} /></label>
          <label>Category<input className="input" required value={form.category} onChange={set('category')} list="cats" /></label>
          <datalist id="cats"><option value="Electronics" /><option value="Fashion" /><option value="Accessories" /><option value="Home" /><option value="Beauty" /></datalist>
          <label>Price (₹)<input className="input" type="number" min="0" step="1" required value={form.price} onChange={set('price')} /></label>
          <label>Stock<input className="input" type="number" min="0" step="1" required value={form.stock} onChange={set('stock')} /></label>
          <label>Image URL<input className="input" type="url" value={form.image} onChange={set('image')} placeholder="https://…" /></label>
          <label className="span-2">Description<textarea className="input" rows="3" value={form.description} onChange={set('description')} /></label>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button>
        </div>
      </form>
    </div>
  );
}

function Products({ products, reload }) {
  const toast = useToast();
  const [editing, setEditing] = useState(null); // null = closed, {} = new, product = edit

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    try { await api(`/admin/products/${p.id}`, { method: 'DELETE' }); toast('Product deleted'); reload(); } catch (err) { toast(err.message, 'error'); }
  };

  return (
    <section className="card table-card">
      <div className="table-head">
        <h3>{products.length} products</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing({})}>+ Add product</button>
      </div>
      <div className="table-scroll">
        <table>
          <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th /></tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td><div className="cell-product"><div className="mini-thumb"><ProductImage src={p.image} name={p.name} /></div>{p.name}</div></td>
                <td>{p.category}</td>
                <td>{rupees(p.price)}</td>
                <td><span className={p.stock <= 5 ? 'text-warn' : ''}>{p.stock}</span></td>
                <td className="row-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing(p)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(p)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <ProductForm initial={editing.id ? editing : null} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />
      )}
    </section>
  );
}

function OrdersTable({ orders, reload }) {
  const toast = useToast();
  const change = async (o, status) => {
    if (status === 'Cancelled' && !window.confirm('Cancel this order? Stock will be returned.')) return;
    try { await api(`/admin/orders/${o.id}`, { method: 'PATCH', body: { status } }); toast(`Order marked ${status}`); reload(); } catch (err) { toast(err.message, 'error'); }
  };
  return (
    <section className="card table-card">
      <div className="table-head"><h3>{orders.length} orders</h3></div>
      {orders.length === 0 ? <p className="muted pad">No orders yet.</p> : (
        <div className="table-scroll">
          <table>
            <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Placed</th><th>Status</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td><b>#{o.id.slice(-6).toUpperCase()}</b></td>
                  <td>{o.userName}<div className="muted small">{o.shipping.city}</div></td>
                  <td>{o.items.reduce((s, i) => s + i.qty, 0)}</td>
                  <td>{rupees(o.total)}</td>
                  <td className="small">{formatDate(o.createdAt)}</td>
                  <td>
                    <select className={`input status-select status-${o.status}`} value={o.status} disabled={o.status === 'Cancelled'} onChange={(e) => change(o, e.target.value)}>
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function Admin() {
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    Promise.all([api('/admin/stats'), api('/products'), api('/admin/orders')])
      .then(([s, p, o]) => { setStats(s); setProducts(p); setOrders(o); })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(reload, [reload]);

  return (
    <div className="container page">
      <div className="page-head">
        <div><h1>Admin dashboard</h1><p className="muted">Manage products and orders</p></div>
      </div>
      <div className="tabs">
        {['dashboard', 'products', 'orders'].map((t) => (
          <button key={t} className={`tab ${tab === t ? 'tab-active' : ''}`} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>
        ))}
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {tab === 'dashboard' && <Dashboard stats={stats} />}
      {tab === 'products' && <Products products={products} reload={reload} />}
      {tab === 'orders' && <OrdersTable orders={orders} reload={reload} />}
    </div>
  );
}
