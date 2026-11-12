import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container page empty">
      <h1 className="big-404">404</h1>
      <h3>Page not found</h3>
      <p className="muted">The page you are looking for doesn’t exist.</p>
      <Link to="/" className="btn btn-primary">Go home</Link>
    </div>
  );
}
