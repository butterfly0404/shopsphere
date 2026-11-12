// In-memory store: same interface as the MongoDB store.
// Used by the automated tests and for running the app locally without a database.
const clone = (o) => (o == null ? null : structuredClone(o));

class MemoryStore {
  constructor() {
    this.users = [];
    this.products = [];
    this.orders = [];
    this.seq = 1;
    this.seedClaimed = false;
  }

  nextId() {
    return String(this.seq++);
  }

  stamp(obj) {
    const now = new Date().toISOString();
    return { ...obj, id: this.nextId(), createdAt: now, updatedAt: now };
  }

  async ping() { return true; }

  async claimSeed() {
    if (this.seedClaimed) return false;
    this.seedClaimed = true;
    return true;
  }

  // ---- users ----
  async createUser(data) {
    if (this.users.some((u) => u.email === data.email)) {
      const err = new Error('duplicate'); err.code = 11000; throw err;
    }
    const user = this.stamp(data);
    this.users.push(user);
    return clone(user);
  }
  async findUserByEmail(email) { return clone(this.users.find((u) => u.email === email)); }
  async findUserById(id) { return clone(this.users.find((u) => u.id === id)); }
  async countUsers() { return this.users.length; }

  // ---- products ----
  async listProducts({ q, category } = {}) {
    let list = [...this.products].reverse(); // newest first
    if (category) list = list.filter((p) => p.category === category);
    if (q) {
      const s = q.toLowerCase();
      list = list.filter((p) =>
        [p.name, p.description, p.category].some((f) => (f || '').toLowerCase().includes(s)));
    }
    return clone(list);
  }
  async getProduct(id) { return clone(this.products.find((p) => p.id === id)); }
  async countProducts() { return this.products.length; }
  async categories() { return [...new Set(this.products.map((p) => p.category))].sort(); }
  async createProduct(data) {
    const p = this.stamp(data);
    this.products.push(p);
    return clone(p);
  }
  async updateProduct(id, data) {
    const p = this.products.find((x) => x.id === id);
    if (!p) return null;
    Object.assign(p, data, { updatedAt: new Date().toISOString() });
    return clone(p);
  }
  async deleteProduct(id) {
    const i = this.products.findIndex((x) => x.id === id);
    if (i === -1) return false;
    this.products.splice(i, 1);
    return true;
  }
  async decrementStock(id, qty) {
    const p = this.products.find((x) => x.id === id);
    if (!p || p.stock < qty) return false;
    p.stock -= qty;
    return true;
  }
  async incrementStock(id, qty) {
    const p = this.products.find((x) => x.id === id);
    if (p) p.stock += qty;
  }

  // ---- orders ----
  async createOrder(data) {
    const o = this.stamp(data);
    this.orders.push(o);
    return clone(o);
  }
  async getOrder(id) { return clone(this.orders.find((o) => o.id === id)); }
  async listOrders() { return clone([...this.orders].reverse()); }
  async listOrdersByUser(userId) {
    return clone([...this.orders].reverse().filter((o) => o.userId === userId));
  }
  async updateOrder(id, patch) {
    const o = this.orders.find((x) => x.id === id);
    if (!o) return null;
    Object.assign(o, patch, { updatedAt: new Date().toISOString() });
    return clone(o);
  }
}

module.exports = MemoryStore;
