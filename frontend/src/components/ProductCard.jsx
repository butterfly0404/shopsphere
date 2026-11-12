import { Link } from 'react-router-dom';
import { rupees } from '../api';
import { useCart, useToast } from '../context/AppContext';
import ProductImage from './ProductImage';
import { StarIcon } from './Icons';

export default function ProductCard({ product }) {
  const cart = useCart();
  const toast = useToast();
  const out = product.stock === 0;

  const add = (e) => {
    e.preventDefault();
    cart.add(product, 1);
    toast(`Added "${product.name}" to cart`);
  };

  return (
    <Link to={`/product/${product.id}`} className="card product-card">
      <div className="product-media">
        <ProductImage src={product.image} name={product.name} />
        {product.stock > 0 && product.stock <= 5 && <span className="badge badge-warn">Only {product.stock} left</span>}
        {out && <span className="badge badge-muted">Out of stock</span>}
      </div>
      <div className="product-body">
        <span className="product-cat">{product.category}</span>
        <h3 className="product-name">{product.name}</h3>
        <div className="product-meta">
          {product.rating > 0
            ? <span className="rating"><StarIcon /> {product.rating.toFixed(1)}</span>
            : <span className="rating rating-new">New</span>}
        </div>
        <div className="product-foot">
          <span className="price">{rupees(product.price)}</span>
          <button className="btn btn-sm btn-primary" onClick={add} disabled={out}>Add</button>
        </div>
      </div>
    </Link>
  );
}

export function ProductSkeleton() {
  return (
    <div className="card product-card skeleton-card">
      <div className="product-media skeleton" />
      <div className="product-body">
        <div className="skeleton line short" />
        <div className="skeleton line" />
        <div className="skeleton line mid" />
      </div>
    </div>
  );
}
