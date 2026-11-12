import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth, useCart, useToast } from '../context/AppContext';
import { OrderSummary } from './Cart';

const PAYMENTS = [
  { id: 'COD', label: 'Cash on delivery', hint: 'Pay when your order arrives' },
  { id: 'UPI', label: 'UPI', hint: 'Demo only, no real payment is taken' },
  { id: 'CARD', label: 'Credit / debit card', hint: 'Demo only, no real payment is taken' },
];

export default function Checkout() {
  const cart = useCart();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: user?.name || '', phone: '', address: '', city: '', pincode: '' });
  const [payment, setPayment] = useState('COD');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (cart.items.length === 0) {
    return (
      <div className="container page empty">
        <h3>Nothing to check out</h3>
        <Link to="/shop" className="btn btn-primary">Go to shop</Link>
      </div>
    );
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const placeOrder = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const order = await api('/orders', {
        method: 'POST',
        body: { items: cart.items.map((i) => ({ productId: i.id, qty: i.qty })), shipping: form, paymentMethod: payment },
      });
      cart.clear();
      toast('Order placed successfully!');
      navigate(`/orders?placed=${order.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page">
      <h1>Checkout</h1>
      <form className="two-col" onSubmit={placeOrder}>
        <div className="stack">
          <section className="card form-card">
            <h3>Delivery address</h3>
            <div className="form-grid">
              <label>Full name<input className="input" required value={form.fullName} onChange={set('fullName')} /></label>
              <label>Phone<input className="input" required inputMode="numeric" pattern="\d{10}" title="10-digit mobile number" value={form.phone} onChange={set('phone')} placeholder="10-digit mobile" /></label>
              <label className="span-2">Address<input className="input" required value={form.address} onChange={set('address')} placeholder="House no., street, area" /></label>
              <label>City<input className="input" required value={form.city} onChange={set('city')} /></label>
              <label>PIN code<input className="input" required inputMode="numeric" pattern="\d{6}" title="6-digit PIN code" value={form.pincode} onChange={set('pincode')} /></label>
            </div>
          </section>
          <section className="card form-card">
            <h3>Payment method</h3>
            <div className="radio-list">
              {PAYMENTS.map((p) => (
                <label key={p.id} className={`radio-card ${payment === p.id ? 'radio-active' : ''}`}>
                  <input type="radio" name="payment" value={p.id} checked={payment === p.id} onChange={() => setPayment(p.id)} />
                  <div><b>{p.label}</b><span className="muted small">{p.hint}</span></div>
                </label>
              ))}
            </div>
          </section>
        </div>
        <OrderSummary cart={cart}>
          {error && <div className="alert alert-error">{error}</div>}
          <button className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? 'Placing order…' : 'Place order'}</button>
        </OrderSummary>
      </form>
    </div>
  );
}
