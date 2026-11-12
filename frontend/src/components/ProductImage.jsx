import { useState } from 'react';

// Shows the product photo; if it fails to load, shows a tidy coloured placeholder instead.
const PALETTE = ['#6366f1', '#0ea5e9', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function ProductImage({ src, name = '', className = '' }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    const color = PALETTE[(name.charCodeAt(0) || 0) % PALETTE.length];
    return (
      <div className={`img-fallback ${className}`} style={{ background: `linear-gradient(135deg, ${color}22, ${color}55)`, color }}>
        {name.charAt(0).toUpperCase() || '?'}
      </div>
    );
  }
  return <img className={className} src={src} alt={name} loading="lazy" onError={() => setFailed(true)} />;
}
