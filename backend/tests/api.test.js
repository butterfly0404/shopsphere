// API tests. Jenkins runs these on every build; if any test fails, nothing is deployed.
const request = require('supertest');
const { createApp } = require('../src/app');
const { seed, PRODUCTS } = require('../src/seed');
const MemoryStore = require('../src/store/memory');

const ADMIN = { adminEmail: 'admin@test.com', adminPassword: 'admin123' };
const quiet = { log: () => {} };
const SHIPPING = { fullName: 'Test User', phone: '9876543210', address: '12 MG Road', city: 'Kolkata', pincode: '700001' };

let app;
let store;

beforeEach(async () => {
  store = new MemoryStore();
  await seed(store, ADMIN, quiet);
  app = createApp({ store, jwtSecret: 'test-secret', version: 'v-test' });
});

async function registerCustomer(email = 'asha@test.com') {
  const res = await request(app).post('/api/auth/register')
    .send({ name: 'Asha', email, password: 'secret123' });
  return res.body.token;
}
async function adminToken() {
  const res = await request(app).post('/api/auth/login')
    .send({ email: ADMIN.adminEmail, password: ADMIN.adminPassword });
  return res.body.token;
}

describe('health', () => {
  test('reports ok, database status and version', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'up', version: 'v-test' });
  });

  test('unknown API route returns 404', async () => {
    expect((await request(app).get('/api/nope')).status).toBe(404);
  });
});

describe('catalogue', () => {
  test('lists all seeded products', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(PRODUCTS.length);
  });

  test('search and category filter work', async () => {
    const search = await request(app).get('/api/products?q=keyboard');
    expect(search.body).toHaveLength(1);
    expect(search.body[0].name).toMatch(/Keyboard/);

    const cat = await request(app).get('/api/products?category=Home');
    expect(cat.body.length).toBeGreaterThan(0);
    expect(cat.body.every((p) => p.category === 'Home')).toBe(true);
  });

  test('sorts by price and limits results', async () => {
    const res = await request(app).get('/api/products?sort=price-asc&limit=3');
    expect(res.body).toHaveLength(3);
    expect(res.body[0].price).toBeLessThanOrEqual(res.body[1].price);
  });

  test('missing product returns 404', async () => {
    expect((await request(app).get('/api/products/does-not-exist')).status).toBe(404);
  });
});

describe('auth', () => {
  test('register, login and fetch profile', async () => {
    const token = await registerCustomer();
    expect(token).toBeTruthy();
    const login = await request(app).post('/api/auth/login').send({ email: 'ASHA@test.com', password: 'secret123' });
    expect(login.status).toBe(200);
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`);
    expect(me.body).toMatchObject({ name: 'Asha', email: 'asha@test.com', role: 'customer' });
    expect(me.body.passwordHash).toBeUndefined();
  });

  test('rejects duplicate email, bad password and weak password', async () => {
    await registerCustomer();
    const dup = await request(app).post('/api/auth/register').send({ name: 'A2', email: 'asha@test.com', password: 'secret123' });
    expect(dup.status).toBe(409);
    const bad = await request(app).post('/api/auth/login').send({ email: 'asha@test.com', password: 'wrong' });
    expect(bad.status).toBe(401);
    const weak = await request(app).post('/api/auth/register').send({ name: 'Bo', email: 'bo@test.com', password: '123' });
    expect(weak.status).toBe(400);
  });
});

describe('orders', () => {
  test('requires login', async () => {
    const res = await request(app).post('/api/orders').send({ items: [], shipping: SHIPPING });
    expect(res.status).toBe(401);
  });

  test('places an order: server prices, stock decrement, shipping fee', async () => {
    const token = await registerCustomer();
    const [mug] = (await request(app).get('/api/products?q=mug')).body; // ₹399, below free-shipping threshold
    const res = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: mug.id, qty: 2, price: 1 }], shipping: SHIPPING, paymentMethod: 'UPI' });
    expect(res.status).toBe(201);
    expect(res.body.subtotal).toBe(798); // client-sent price is ignored
    expect(res.body.shippingFee).toBe(49);
    expect(res.body.total).toBe(847);
    expect(res.body.status).toBe('Placed');

    const after = (await request(app).get(`/api/products/${mug.id}`)).body;
    expect(after.stock).toBe(mug.stock - 2);

    const mine = await request(app).get('/api/orders/me').set('Authorization', `Bearer ${token}`);
    expect(mine.body).toHaveLength(1);
  });

  test('free shipping from ₹999', async () => {
    const token = await registerCustomer();
    const [kb] = (await request(app).get('/api/products?q=keyboard')).body;
    const res = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: kb.id, qty: 1 }], shipping: SHIPPING });
    expect(res.body.shippingFee).toBe(0);
  });

  test('rejects an order larger than the stock and leaves stock unchanged', async () => {
    const token = await registerCustomer();
    const [plant] = (await request(app).get('/api/products?q=plant')).body; // stock 4
    const res = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: plant.id, qty: 5 }], shipping: SHIPPING });
    expect(res.status).toBe(409);
    expect((await request(app).get(`/api/products/${plant.id}`)).body.stock).toBe(plant.stock);
  });

  test('validates delivery details', async () => {
    const token = await registerCustomer();
    const [mug] = (await request(app).get('/api/products?q=mug')).body;
    const res = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: mug.id, qty: 1 }], shipping: { ...SHIPPING, pincode: '12' } });
    expect(res.status).toBe(400);
  });
});

describe('admin', () => {
  test('customers are blocked from admin routes', async () => {
    const token = await registerCustomer();
    const res = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('admin can add, edit and delete a product', async () => {
    const token = await adminToken();
    const h = { Authorization: `Bearer ${token}` };
    const created = await request(app).post('/api/admin/products').set(h)
      .send({ name: 'Test Lamp', category: 'Home', price: 999, stock: 3 });
    expect(created.status).toBe(201);
    const updated = await request(app).put(`/api/admin/products/${created.body.id}`).set(h).send({ price: 899 });
    expect(updated.body.price).toBe(899);
    const bad = await request(app).put(`/api/admin/products/${created.body.id}`).set(h).send({ stock: -1 });
    expect(bad.status).toBe(400);
    expect((await request(app).delete(`/api/admin/products/${created.body.id}`).set(h)).status).toBe(204);
  });

  test('admin updates order status; cancelling returns stock', async () => {
    const customer = await registerCustomer();
    const [mug] = (await request(app).get('/api/products?q=mug')).body;
    const order = (await request(app).post('/api/orders').set('Authorization', `Bearer ${customer}`)
      .send({ items: [{ productId: mug.id, qty: 3 }], shipping: SHIPPING })).body;

    const h = { Authorization: `Bearer ${await adminToken()}` };
    const shipped = await request(app).patch(`/api/admin/orders/${order.id}`).set(h).send({ status: 'Shipped' });
    expect(shipped.body.status).toBe('Shipped');
    await request(app).patch(`/api/admin/orders/${order.id}`).set(h).send({ status: 'Cancelled' });
    expect((await request(app).get(`/api/products/${mug.id}`)).body.stock).toBe(mug.stock);

    const stats = await request(app).get('/api/admin/stats').set(h);
    expect(stats.body).toMatchObject({ orders: 1, revenue: 0, customers: 2 });
    expect(stats.body.ordersByStatus.Cancelled).toBe(1);
  });
});
