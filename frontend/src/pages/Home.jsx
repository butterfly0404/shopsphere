import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import ProductCard, { ProductSkeleton } from '../components/ProductCard';
import ProductImage from '../components/ProductImage';
import { ReturnIcon, ShieldIcon, TruckIcon } from '../components/Icons';

const CATEGORY_COLORS = ['#eef2ff', '#ecfeff', '#f0fdf4', '#fff7ed', '#fdf2f8', '#f5f3ff'];

export default function Home() {
  const [products, setProducts] = useState(null);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/products?sort=rating&limit=8').then(setProducts).catch((e) => setError(e.message));
    api('/categories').then(setCategories).catch(() => {});
  }, []);

  const heroPicks = (products || []).slice(0, 3);

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">New season · Free shipping over ₹999</span>
            <h1>Everything you love,<br />delivered to your door.</h1>
            <p>Electronics, fashion, accessories and home essentials, hand-picked for quality and priced fairly.</p>
            <div className="hero-cta">
              <Link to="/shop" className="btn btn-primary btn-lg">Shop now</Link>
              <Link to="/shop?sort=price-asc" className="btn btn-ghost btn-lg">Browse deals</Link>
            </div>
          </div>
          <div className="hero-art">
            {heroPicks.map((p, i) => (
              <Link key={p.id} to={`/product/${p.id}`} className={`hero-tile hero-tile-${i}`}>
                <ProductImage src={p.image} name={p.name} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container features">
        <div className="feature"><TruckIcon /><div><b>Free delivery</b><span>On orders over ₹999</span></div></div>
        <div className="feature"><ShieldIcon /><div><b>Secure checkout</b><span>Your data stays protected</span></div></div>
        <div className="feature"><ReturnIcon /><div><b>Easy returns</b><span>7-day hassle-free returns</span></div></div>
      </section>

      {categories.length > 0 && (
        <section className="container section">
          <div className="section-head"><h2>Shop by category</h2></div>
          <div className="category-grid">
            {categories.map((c, i) => (
              <Link key={c} to={`/shop?category=${encodeURIComponent(c)}`} className="category-tile" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}>
                <span className="category-initial">{c.charAt(0)}</span>
                <span>{c}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="container section">
        <div className="section-head">
          <h2>Top rated</h2>
          <Link to="/shop" className="link">View all →</Link>
        </div>
        {error && <div className="alert alert-error">Could not load products: {error}</div>}
        <div className="product-grid">
          {products
            ? products.map((p) => <ProductCard key={p.id} product={p} />)
            : Array.from({ length: 8 }, (_, i) => <ProductSkeleton key={i} />)}
        </div>
      </section>
    </>
  );
}
