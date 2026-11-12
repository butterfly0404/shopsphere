// MongoDB store (used in Kubernetes). Same interface as MemoryStore.
const mongoose = require('mongoose');

const opts = { timestamps: true };

const User = mongoose.model('User', new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
}, opts));

const Product = mongoose.model('Product', new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, required: true, index: true },
  stock: { type: Number, required: true, min: 0 },
  image: { type: String, default: '' },
  rating: { type: Number, default: 0 },
}, opts));

const orderItem = new mongoose.Schema({
  productId: String, name: String, price: Number, qty: Number, image: String,
}, { _id: false });

const Order = mongoose.model('Order', new mongoose.Schema({
  userId: { type: String, index: true },
  userName: String,
  items: [orderItem],
  subtotal: Number,
  shippingFee: Number,
  total: Number,
  shipping: { fullName: String, phone: String, address: String, city: String, pincode: String },
  paymentMethod: String,
  status: { type: String, default: 'Placed' },
}, opts));

// One document whose insert acts as a lock, so only one pod seeds the database.
const Meta = mongoose.model('Meta', new mongoose.Schema({ _id: String }));

const toObj = (doc) => {
  if (!doc) return null;
  const { _id, __v, ...rest } = doc;
  return { ...rest, id: String(_id) };
};
const validId = (id) => mongoose.isValidObjectId(id);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class MongoStore {
  async connectWithRetry(uri, log = console) {
    for (let attempt = 1; ; attempt++) {
      try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        log.log(`[db] connected to MongoDB (attempt ${attempt})`);
        return;
      } catch (err) {
        log.log(`[db] connection failed (attempt ${attempt}): ${err.message}. Retrying in 3s`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }

  async disconnect() { await mongoose.disconnect(); }

  async ping() { return mongoose.connection.readyState === 1; }

  async claimSeed() {
    try {
      await Meta.create({ _id: 'seed-v1' });
      return true;
    } catch (err) {
      if (err.code === 11000) return false;
      throw err;
    }
  }

  // ---- users ----
  async createUser(data) { return toObj((await User.create(data)).toObject()); }
  async findUserByEmail(email) { return toObj(await User.findOne({ email }).lean()); }
  async findUserById(id) { return validId(id) ? toObj(await User.findById(id).lean()) : null; }
  async countUsers() { return User.countDocuments(); }

  // ---- products ----
  async listProducts({ q, category } = {}) {
    const filter = {};
    if (category) filter.category = category;
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ name: rx }, { description: rx }, { category: rx }];
    }
    return (await Product.find(filter).sort({ createdAt: -1, _id: -1 }).lean()).map(toObj);
  }
  async getProduct(id) { return validId(id) ? toObj(await Product.findById(id).lean()) : null; }
  async countProducts() { return Product.countDocuments(); }
  async categories() { return (await Product.distinct('category')).sort(); }
  async createProduct(data) { return toObj((await Product.create(data)).toObject()); }
  async updateProduct(id, data) {
    if (!validId(id)) return null;
    return toObj(await Product.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean());
  }
  async deleteProduct(id) {
    if (!validId(id)) return false;
    return !!(await Product.findByIdAndDelete(id));
  }
  async decrementStock(id, qty) {
    if (!validId(id)) return false;
    const r = await Product.updateOne({ _id: id, stock: { $gte: qty } }, { $inc: { stock: -qty } });
    return r.modifiedCount === 1;
  }
  async incrementStock(id, qty) {
    if (validId(id)) await Product.updateOne({ _id: id }, { $inc: { stock: qty } });
  }

  // ---- orders ----
  async createOrder(data) { return toObj((await Order.create(data)).toObject()); }
  async getOrder(id) { return validId(id) ? toObj(await Order.findById(id).lean()) : null; }
  async listOrders() { return (await Order.find().sort({ createdAt: -1 }).lean()).map(toObj); }
  async listOrdersByUser(userId) {
    return (await Order.find({ userId }).sort({ createdAt: -1 }).lean()).map(toObj);
  }
  async updateOrder(id, patch) {
    if (!validId(id)) return null;
    return toObj(await Order.findByIdAndUpdate(id, patch, { new: true }).lean());
  }
}

module.exports = MongoStore;
