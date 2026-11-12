import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import ProductCard, { ProductSkeleton } from '../components/ProductCard';

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const sort = params.get('sort') || '';
  const [products, setProducts] = useState(null);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState(q);
  const [error, setError] = useState('');

  useEffect(() => { api('/categories').then(setCategories).catch(() => {}); }, []);
  useEffect(() => { setSearch(q); }, [q]);

  useEffect(() => {
    setProducts(null);
    setError('');
    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    if (category) qs.set('category', category);
    if (sort) qs.set('sort', sort);
    api(`/products?${qs}`).then(setProducts).catch((e) => setError(e.message));
  }, [q, category, sort]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next);
  };

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>{category || 'All products'}</h1>
          <p className="muted">{products ? `${products.length} item${products.length === 1 ? '' : 's'}` : 'Loading…'}{q && ` for "${q}"`}</p>
        </div>
        <div className="toolbar">
          <form onSubmit={(e) => { e.preventDefault(); setParam('q', search.trim()); }}>
            <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" />
          </form>
          <select className="input" value={sort} onChange={(e) => setParam('sort', e.target.value)} aria-label="Sort">
            <option value="">Newest</option>
            <option value="rating">Top rated</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </div>
      </div>

      <div className="chips">
        <button className={`chip ${!category ? 'chip-active' : ''}`} onClick={() => setParam('category', '')}>All</button>
        {categories.map((c) => (
          <button key={c} className={`chip ${category === c ? 'chip-active' : ''}`} onClick={() => setParam('category', c)}>{c}</button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {products && products.length === 0 && (
        <div className="empty">
          <h3>No products found</h3>
          <p className="muted">Try a different search or category.</p>
          <button className="btn btn-ghost" onClick={() => setParams({})}>Clear filters</button>
        </div>
      )}
      <div className="product-grid">
        {products
          ? products.map((p) => <ProductCard key={p.id} product={p} />)
          : Array.from({ length: 8 }, (_, i) => <ProductSkeleton key={i} />)}
      </div>
    </div>
  );
}
