const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const ORDER_STATUSES = ['Placed', 'Shipped', 'Delivered', 'Cancelled'];
const PAYMENT_METHODS = ['COD', 'UPI', 'CARD'];
const FREE_SHIPPING_FROM = 999;
const SHIPPING_FEE = 49;
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Validates product fields sent by the admin. `partial` allows updates of single fields.
function parseProduct(body, partial = false) {
  const out = {};
  const has = (k) => body[k] !== undefined;
  if (!partial || has('name')) {
    out.name = str(body.name);
    if (out.name.length < 2) throw httpError(400, 'Product name must be at least 2 characters');
  }
  if (!partial || has('category')) {
    out.category = str(body.category);
    if (!out.category) throw httpError(400, 'Category is required');
  }
  if (!partial || has('price')) {
    out.price = Number(body.price);
    if (!Number.isFinite(out.price) || out.price < 0) throw httpError(400, 'Price must be 0 or more');
  }
  if (!partial || has('stock')) {
    out.stock = Number(body.stock);
    if (!Number.isInteger(out.stock) || out.stock < 0) throw httpError(400, 'Stock must be a whole number, 0 or more');
  }
  if (has('description')) out.description = str(body.description);
  if (has('image')) out.image = str(body.image);
  if (!partial && out.description === undefined) out.description = '';
  if (!partial && out.image === undefined) out.image = '';
  return out;
}

function createApp({ store, jwtSecret, version = 'dev', publicDir } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  const sign = (u) => jwt.sign({ sub: u.id, role: u.role, name: u.name }, jwtSecret, { expiresIn: '7d' });

  const auth = (req, res, next) => {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) return next(httpError(401, 'Please log in'));
    try {
      const p = jwt.verify(token, jwtSecret);
      req.user = { id: p.sub, role: p.role, name: p.name };
      return next();
    } catch {
      return next(httpError(401, 'Session expired, please log in again'));
    }
  };
  const adminOnly = (req, res, next) =>
    (req.user && req.user.role === 'admin' ? next() : next(httpError(403, 'Admins only')));

  // ---------- health ----------
  app.get('/api/live', (req, res) => res.json({ status: 'alive' }));
  app.get('/api/health', ah(async (req, res) => {
    const dbUp = await store.ping();
    res.status(dbUp ? 200 : 503).json({
      status: dbUp ? 'ok' : 'degraded',
      db: dbUp ? 'up' : 'down',
      version,
      pod: os.hostname(),
      uptimeSeconds: Math.round(process.uptime()),
    });
  }));

  // ---------- auth ----------
  app.post('/api/auth/register', ah(async (req, res) => {
    const name = str(req.body.name);
    const email = str(req.body.email).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (name.length < 2) throw httpError(400, 'Name must be at least 2 characters');
    if (!EMAIL_RX.test(email)) throw httpError(400, 'Enter a valid email address');
    if (password.length < 6) throw httpError(400, 'Password must be at least 6 characters');
    if (await store.findUserByEmail(email)) throw httpError(409, 'An account with this email already exists');
    let user;
    try {
      user = await store.createUser({ name, email, passwordHash: await bcrypt.hash(password, 10), role: 'customer' });
    } catch (err) {
      if (err.code === 11000) throw httpError(409, 'An account with this email already exists');
      throw err;
    }
    res.status(201).json({ token: sign(user), user: publicUser(user) });
  }));

  app.post('/api/auth/login', ah(async (req, res) => {
    const email = str(req.body.email).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const user = email && (await store.findUserByEmail(email));
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw httpError(401, 'Invalid email or password');
    }
    res.json({ token: sign(user), user: publicUser(user) });
  }));

  app.get('/api/auth/me', auth, ah(async (req, res) => {
    const user = await store.findUserById(req.user.id);
    if (!user) throw httpError(401, 'Please log in');
    res.json(publicUser(user));
  }));

  // ---------- catalogue ----------
  app.get('/api/categories', ah(async (req, res) => res.json(await store.categories())));

  app.get('/api/products', ah(async (req, res) => {
    let list = await store.listProducts({ q: str(req.query.q), category: str(req.query.category) });
    const sort = str(req.query.sort);
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    else if (sort === 'rating') list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const limit = parseInt(req.query.limit, 10);
    if (limit > 0) list = list.slice(0, limit);
    res.json(list);
  }));

  app.get('/api/products/:id', ah(async (req, res) => {
    const p = await store.getProduct(req.params.id);
    if (!p) throw httpError(404, 'Product not found');
    res.json(p);
  }));

  // ---------- orders ----------
  app.post('/api/orders', auth, ah(async (req, res) => {
    const { items, shipping = {}, paymentMethod = 'COD' } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) throw httpError(400, 'Your cart is empty');
    if (items.length > 50) throw httpError(400, 'Too many items in one order');
    if (!PAYMENT_METHODS.includes(paymentMethod)) throw httpError(400, 'Invalid payment method');

    const ship = {
      fullName: str(shipping.fullName), phone: str(shipping.phone),
      address: str(shipping.address), city: str(shipping.city), pincode: str(shipping.pincode),
    };
    if (!ship.fullName || !ship.address || !ship.city) throw httpError(400, 'Please fill in the delivery address');
    if (!/^\d{10}$/.test(ship.phone)) throw httpError(400, 'Phone must be 10 digits');
    if (!/^\d{6}$/.test(ship.pincode)) throw httpError(400, 'PIN code must be 6 digits');

    // Merge duplicate lines; prices always come from the database, never the client.
    const wanted = new Map();
    for (const it of items) {
      const qty = Number(it && it.qty);
      const id = str(it && it.productId);
      if (!id || !Number.isInteger(qty) || qty < 1 || qty > 20) throw httpError(400, 'Invalid item in cart');
      wanted.set(id, (wanted.get(id) || 0) + qty);
    }
    const lines = [];
    for (const [id, qty] of wanted) {
      const p = await store.getProduct(id);
      if (!p) throw httpError(400, 'A product in your cart no longer exists');
      if (p.stock < qty) throw httpError(409, `Only ${p.stock} left of "${p.name}"`);
      lines.push({ productId: p.id, name: p.name, price: p.price, qty, image: p.image });
    }

    const reserved = [];
    for (const l of lines) {
      if (!(await store.decrementStock(l.productId, l.qty))) {
        for (const r of reserved) await store.incrementStock(r.productId, r.qty);
        throw httpError(409, `"${l.name}" just went out of stock`);
      }
      reserved.push(l);
    }

    const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
    const shippingFee = subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
    const order = await store.createOrder({
      userId: req.user.id,
      userName: req.user.name,
      items: lines,
      subtotal,
      shippingFee,
      total: subtotal + shippingFee,
      shipping: ship,
      paymentMethod,
      status: 'Placed',
    });
    res.status(201).json(order);
  }));

  app.get('/api/orders/me', auth, ah(async (req, res) => {
    res.json(await store.listOrdersByUser(req.user.id));
  }));

  // ---------- admin ----------
  const admin = express.Router();
  admin.use(auth, adminOnly);

  admin.get('/stats', ah(async (req, res) => {
    const [products, orders, customers] = await Promise.all([
      store.listProducts(), store.listOrders(), store.countUsers(),
    ]);
    const active = orders.filter((o) => o.status !== 'Cancelled');
    const byStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0]));
    orders.forEach((o) => { byStatus[o.status] = (byStatus[o.status] || 0) + 1; });
    res.json({
      products: products.length,
      orders: orders.length,
      customers,
      revenue: active.reduce((s, o) => s + o.total, 0),
      ordersByStatus: byStatus,
      lowStock: products.filter((p) => p.stock <= 5).map((p) => ({ id: p.id, name: p.name, stock: p.stock })),
    });
  }));

  admin.post('/products', ah(async (req, res) => {
    res.status(201).json(await store.createProduct({ ...parseProduct(req.body || {}), rating: 0 }));
  }));

  admin.put('/products/:id', ah(async (req, res) => {
    const p = await store.updateProduct(req.params.id, parseProduct(req.body || {}, true));
    if (!p) throw httpError(404, 'Product not found');
    res.json(p);
  }));

  admin.delete('/products/:id', ah(async (req, res) => {
    if (!(await store.deleteProduct(req.params.id))) throw httpError(404, 'Product not found');
    res.status(204).end();
  }));

  admin.get('/orders', ah(async (req, res) => res.json(await store.listOrders())));

  admin.patch('/orders/:id', ah(async (req, res) => {
    const status = str(req.body && req.body.status);
    if (!ORDER_STATUSES.includes(status)) throw httpError(400, `Status must be one of ${ORDER_STATUSES.join(', ')}`);
    const order = await store.getOrder(req.params.id);
    if (!order) throw httpError(404, 'Order not found');
    if (order.status === 'Cancelled' && status !== 'Cancelled') throw httpError(400, 'A cancelled order cannot be reopened');
    if (status === 'Cancelled' && order.status !== 'Cancelled') {
      for (const l of order.items) await store.incrementStock(l.productId, l.qty); // return stock
    }
    res.json(await store.updateOrder(req.params.id, { status }));
  }));

  app.use('/api/admin', admin);
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  // ---------- frontend (React build) ----------
  if (publicDir && fs.existsSync(path.join(publicDir, 'index.html'))) {
    app.use(express.static(publicDir, { index: false, maxAge: '1h' }));
    app.get('*', (req, res) => {
      res.set('Cache-Control', 'no-cache');
      res.sendFile(path.join(publicDir, 'index.html'));
    });
  }

  // ---------- errors ----------
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
    const status = err.status || 500;
    if (status >= 500) console.error('[error]', err);
    return res.status(status).json({ error: status >= 500 ? 'Something went wrong' : err.message });
  });

  return app;
}

module.exports = { createApp, ORDER_STATUSES };
