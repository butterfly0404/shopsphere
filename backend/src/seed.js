// Sample catalogue + admin account, created on first start.
const bcrypt = require('bcryptjs');

const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&q=70`;

const PRODUCTS = [
  { name: 'Aurora Wireless Headphones', category: 'Electronics', price: 4999, stock: 25, rating: 4.6,
    image: img('photo-1505740420928-5e560c06d30e'),
    description: 'Over-ear Bluetooth headphones with active noise cancellation and 30-hour battery life.' },
  { name: 'Classic Analog Watch', category: 'Accessories', price: 3499, stock: 18, rating: 4.4,
    image: img('photo-1523275335684-37898b6baf30'),
    description: 'Minimal stainless-steel watch with a leather strap and scratch-resistant glass.' },
  { name: 'Velocity Running Shoes', category: 'Fashion', price: 2999, stock: 30, rating: 4.5,
    image: img('photo-1542291026-7eec264c27ff'),
    description: 'Lightweight running shoes with breathable mesh and cushioned sole for daily runs.' },
  { name: 'Retro Instant Camera', category: 'Electronics', price: 6499, stock: 8, rating: 4.3,
    image: img('photo-1526170375885-4d8ecf77b99f'),
    description: 'Instant-print camera with a built-in flash and selfie mirror. Prints in seconds.' },
  { name: 'Polarised Sunglasses', category: 'Accessories', price: 1299, stock: 40, rating: 4.2,
    image: img('photo-1572635196237-14b3f281503f'),
    description: 'UV400 polarised lenses in a light, durable frame. Comes with a hard case.' },
  { name: 'Urban Laptop Backpack', category: 'Accessories', price: 1899, stock: 22, rating: 4.7,
    image: img('photo-1553062407-98eeb64c6a62'),
    description: 'Water-resistant 25 L backpack with a padded 15.6" laptop sleeve and USB charging port.' },
  { name: 'Mechanical Keyboard', category: 'Electronics', price: 3999, stock: 15, rating: 4.8,
    image: img('photo-1587829741301-dc798b83add3'),
    description: 'Compact 75% mechanical keyboard with hot-swappable switches and RGB backlight.' },
  { name: 'Essential Cotton T-Shirt', category: 'Fashion', price: 599, stock: 60, rating: 4.1,
    image: img('photo-1521572163474-6864f9cf17ab'),
    description: '100% combed cotton crew-neck tee with a relaxed fit. Pre-shrunk.' },
  { name: 'Ceramic Coffee Mug', category: 'Home', price: 399, stock: 50, rating: 4.3,
    image: img('photo-1514228742587-6b1558fcca3d'),
    description: '350 ml handmade ceramic mug, microwave and dishwasher safe.' },
  { name: 'Indoor Plant in Pot', category: 'Home', price: 799, stock: 4, rating: 4.6,
    image: img('photo-1485955900006-10f4d324d411'),
    description: 'Low-maintenance indoor plant in a matte ceramic pot. Purifies air.' },
  { name: 'Wooden Desk Lamp', category: 'Home', price: 1599, stock: 12, rating: 4.4,
    image: img('photo-1507473885765-e6ed057f782c'),
    description: 'Warm LED desk lamp with a natural wood base and adjustable neck.' },
  { name: 'Eau de Parfum 100 ml', category: 'Beauty', price: 2499, stock: 20, rating: 4.5,
    image: img('photo-1541643600914-78b084683601'),
    description: 'Long-lasting fragrance with notes of citrus, amber and sandalwood.' },
];

async function seed(store, { adminEmail, adminPassword }, log = console) {
  // Admin account (created once; a unique email index stops duplicates).
  if (!(await store.findUserByEmail(adminEmail))) {
    try {
      await store.createUser({
        name: 'Store Admin',
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 10),
        role: 'admin',
      });
      log.log(`[seed] admin user created: ${adminEmail}`);
    } catch (err) {
      if (err.code !== 11000) throw err; // another pod created it first
    }
  }
  // Products: only the pod that wins the seed lock inserts them.
  if ((await store.claimSeed()) && (await store.countProducts()) === 0) {
    for (const p of PRODUCTS) await store.createProduct(p);
    log.log(`[seed] ${PRODUCTS.length} products created`);
  }
}

module.exports = { seed, PRODUCTS };
