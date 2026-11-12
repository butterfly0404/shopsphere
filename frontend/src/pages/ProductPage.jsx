import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, rupees } from '../api';
import { useCart, useToast } from '../context/AppContext';
import ProductImage from '../components/ProductImage';
import { ReturnIcon, ShieldIcon, StarIcon, TruckIcon } from '../components/Icons';

export function QtyStepper({ value, max, onChange }) {
  return (
    <div className="qty">
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Decrease">−</button>
      <span>{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase">+</button>
    </div>
  );
}

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const cart = useCart();
  const toast = useToast();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setProduct(null);
    setQty(1);
    api(`/products/${id}`).then(setProduct).catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div className="container page empty">
        <h3>{error}</h3>
        <Link to="/shop" className="btn btn-primary">Back to shop</Link>
      </div>
    );
  }
  if (!product) return <div className="container page"><div className="spinner" /></div>;

  const max = Math.min(product.stock, 20);
  const out = product.stock === 0;
  const addToCart = () => { cart.add(product, qty); toast(`Added ${qty} × "${product.name}" to cart`); };
  const buyNow = () => { cart.add(product, qty); navigate('/cart'); };

  return (
    <div className="container page">
      <nav className="breadcrumb">
        <Link to="/shop">Shop</Link> / <Link to={`/shop?category=${encodeURIComponent(product.category)}`}>{product.category}</Link> / <span>{product.name}</span>
      </nav>
      <div className="product-detail">
        <div className="detail-media card"><ProductImage src={product.image} name={product.name} /></div>
        <div className="detail-info">
          <span className="product-cat">{product.category}</span>
          <h1>{product.name}</h1>
          {product.rating > 0 && <div className="rating rating-lg"><StarIcon /> {product.rating.toFixed(1)} rating</div>}
          <div className="detail-price">{rupees(product.price)} <span className="muted small">incl. all taxes</span></div>
          <p className="detail-desc">{product.description}</p>
          <div className={`stock ${out ? 'stock-out' : product.stock <= 5 ? 'stock-low' : 'stock-ok'}`}>
            {out ? 'Out of stock' : product.stock <= 5 ? `Hurry, only ${product.stock} left` : 'In stock'}
          </div>
          {!out && (
            <div className="detail-actions">
              <QtyStepper value={qty} max={max} onChange={(v) => setQty(Math.max(1, Math.min(v, max)))} />
              <button className="btn btn-primary btn-lg" onClick={addToCart}>Add to cart</button>
              <button className="btn btn-ghost btn-lg" onClick={buyNow}>Buy now</button>
            </div>
          )}
          <ul className="perks">
            <li><TruckIcon /> Free delivery on orders over ₹999</li>
            <li><ReturnIcon /> 7-day easy returns</li>
            <li><ShieldIcon /> Secure checkout</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
