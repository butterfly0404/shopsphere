import { Link, useNavigate } from 'react-router-dom';
import { rupees } from '../api';
import { useCart } from '../context/AppContext';
import ProductImage from '../components/ProductImage';
import { TrashIcon } from '../components/Icons';
import { QtyStepper } from './ProductPage';

export function OrderSummary({ cart, children }) {
  const remaining = 999 - cart.subtotal;
  return (
    <aside className="card summary">
      <h3>Order summary</h3>
      <div className="summary-row"><span>Subtotal ({cart.count} items)</span><span>{rupees(cart.subtotal)}</span></div>
      <div className="summary-row"><span>Shipping</span><span>{cart.shipping === 0 ? <b className="text-ok">FREE</b> : rupees(cart.shipping)}</span></div>
      {remaining > 0 && cart.subtotal > 0 && (
        <div className="ship-progress">
          <div className="bar"><span style={{ width: `${Math.min(100, (cart.subtotal / 999) * 100)}%` }} /></div>
          <small className="muted">Add {rupees(remaining)} more for free delivery</small>
        </div>
      )}
      <div className="summary-row summary-total"><span>Total</span><span>{rupees(cart.total)}</span></div>
      {children}
    </aside>
  );
}

export default function Cart() {
  const cart = useCart();
  const navigate = useNavigate();

  if (cart.items.length === 0) {
    return (
      <div className="container page empty">
        <h3>Your cart is empty</h3>
        <p className="muted">Looks like you haven’t added anything yet.</p>
        <Link to="/shop" className="btn btn-primary">Start shopping</Link>
      </div>
    );
  }

  return (
    <div className="container page">
      <h1>Shopping cart</h1>
      <div className="two-col">
        <div className="card cart-list">
          {cart.items.map((i) => (
            <div key={i.id} className="cart-row">
              <Link to={`/product/${i.id}`} className="cart-thumb"><ProductImage src={i.image} name={i.name} /></Link>
              <div className="cart-info">
                <Link to={`/product/${i.id}`} className="cart-name">{i.name}</Link>
                <span className="muted small">{i.category} · {rupees(i.price)} each</span>
              </div>
              <QtyStepper value={i.qty} max={Math.min(i.stock, 20)} onChange={(v) => cart.update(i.id, v)} />
              <span className="cart-line-total">{rupees(i.price * i.qty)}</span>
              <button className="icon-btn" onClick={() => cart.remove(i.id)} aria-label={`Remove ${i.name}`}><TrashIcon /></button>
            </div>
          ))}
        </div>
        <OrderSummary cart={cart}>
          <button className="btn btn-primary btn-block btn-lg" onClick={() => navigate('/checkout')}>Proceed to checkout</button>
          <Link to="/shop" className="btn btn-ghost btn-block">Continue shopping</Link>
        </OrderSummary>
      </div>
    </div>
  );
}
