import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, formatDate, rupees } from '../api';
import ProductImage from '../components/ProductImage';

const STEPS = ['Placed', 'Shipped', 'Delivered'];

export function StatusTracker({ status }) {
  if (status === 'Cancelled') return <span className="status status-Cancelled">Cancelled</span>;
  const current = STEPS.indexOf(status);
  return (
    <div className="tracker">
      {STEPS.map((s, i) => (
        <div key={s} className={`tracker-step ${i <= current ? 'done' : ''}`}>
          <span className="tracker-dot">{i < current || status === 'Delivered' ? '✓' : i + 1}</span>
          <span className="tracker-label">{s}</span>
        </div>
      ))}
    </div>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [params] = useSearchParams();
  const placed = params.get('placed');

  useEffect(() => { api('/orders/me').then(setOrders).catch((e) => setError(e.message)); }, []);

  if (error) return <div className="container page"><div className="alert alert-error">{error}</div></div>;
  if (!orders) return <div className="container page"><div className="spinner" /></div>;

  return (
    <div className="container page">
      <h1>My orders</h1>
      {placed && <div className="alert alert-ok">Thank you! Your order has been placed and will be shipped soon.</div>}
      {orders.length === 0 && (
        <div className="empty">
          <h3>No orders yet</h3>
          <Link to="/shop" className="btn btn-primary">Start shopping</Link>
        </div>
      )}
      <div className="stack">
        {orders.map((o) => (
          <article key={o.id} className={`card order-card ${o.id === placed ? 'order-new' : ''}`}>
            <header className="order-head">
              <div>
                <b>Order #{o.id.slice(-6).toUpperCase()}</b>
                <span className="muted small">{formatDate(o.createdAt)} · {o.paymentMethod}</span>
              </div>
              <StatusTracker status={o.status} />
            </header>
            <div className="order-items">
              {o.items.map((i) => (
                <div key={i.productId} className="order-item">
                  <div className="order-thumb"><ProductImage src={i.image} name={i.name} /></div>
                  <span>{i.name} <span className="muted">× {i.qty}</span></span>
                  <span>{rupees(i.price * i.qty)}</span>
                </div>
              ))}
            </div>
            <footer className="order-foot">
              <span className="muted small">Deliver to {o.shipping.fullName}, {o.shipping.city} {o.shipping.pincode}</span>
              <b>Total {rupees(o.total)}</b>
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}
