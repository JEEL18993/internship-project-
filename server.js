const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { MongoClient } = require("mongodb");

loadEnvFile();

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.DB_NAME || "shopease";
const PUBLIC_DIR = path.join(__dirname, "public");
const sessions = new Map();

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

let mongoClient;
let db;

const adminCredentials = {
  email: "admin@shop.com",
  password: "admin123"
};

const categories = ["Grocery", "Clothes", "Electronic Gadgets", "Footwear", "Home Appliances", "Beauty", "Books", "Sports"];

const seedProducts = [
  {
    id: "p-headphones",
    name: "Wireless Headphones",
    category: "Electronic Gadgets",
    price: 2499,
    stock: 18,
    image: "headphones",
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
    description: "Comfortable Bluetooth headphones with clear sound and long battery life."
  },
  {
    id: "p-hoodie",
    name: "Classic Hoodie",
    category: "Clothes",
    price: 1299,
    stock: 32,
    image: "hoodie",
    imageUrl: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80",
    description: "Soft cotton hoodie for daily wear, available in multiple sizes."
  },
  {
    id: "p-lamp",
    name: "Desk Lamp",
    category: "Home Appliances",
    price: 899,
    stock: 24,
    image: "lamp",
    imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80",
    description: "Adjustable LED desk lamp with warm and cool light modes."
  },
  {
    id: "p-shoes",
    name: "Training Shoes",
    category: "Footwear",
    price: 2199,
    stock: 14,
    image: "shoes",
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
    description: "Lightweight shoes made for walking, running, and gym training."
  },
  {
    id: "p-smartwatch",
    name: "Smart Watch",
    category: "Electronic Gadgets",
    price: 3499,
    stock: 20,
    image: "box",
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80",
    description: "Fitness tracking smartwatch with heart-rate monitor and notification alerts."
  },
  {
    id: "p-backpack",
    name: "Travel Backpack",
    category: "Clothes",
    price: 1599,
    stock: 26,
    image: "box",
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80",
    description: "Durable backpack with laptop section and water-resistant fabric."
  },
  {
    id: "p-sunscreen",
    name: "Daily Sunscreen",
    category: "Beauty",
    price: 499,
    stock: 40,
    image: "box",
    imageUrl: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=80",
    description: "Lightweight SPF sunscreen for daily skin protection."
  },
  {
    id: "p-yogamat",
    name: "Yoga Mat",
    category: "Sports",
    price: 799,
    stock: 35,
    image: "box",
    imageUrl: "https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?auto=format&fit=crop&w=900&q=80",
    description: "Non-slip yoga mat for exercise, stretching, and home workouts."
  },
  {
    id: "p-kettle",
    name: "Electric Kettle",
    category: "Home Appliances",
    price: 1199,
    stock: 16,
    image: "box",
    imageUrl: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=80",
    description: "Fast-heating electric kettle with auto shut-off safety."
  },
  {
    id: "p-novel",
    name: "Modern Novel",
    category: "Books",
    price: 349,
    stock: 50,
    image: "box",
    imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=900&q=80",
    description: "Paperback novel for everyday reading and gifting."
  },
  {
    id: "p-speaker",
    name: "Bluetooth Speaker",
    category: "Electronic Gadgets",
    price: 1899,
    stock: 22,
    image: "box",
    imageUrl: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=900&q=80",
    description: "Portable speaker with deep bass and splash-resistant design."
  },
  {
    id: "p-tshirt",
    name: "Cotton T-Shirt",
    category: "Clothes",
    price: 599,
    stock: 60,
    image: "hoodie",
    imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
    description: "Breathable cotton T-shirt suitable for daily casual wear."
  },
  {
    id: "p-rice",
    name: "Basmati Rice",
    category: "Grocery",
    price: 799,
    stock: 45,
    image: "box",
    imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80",
    description: "Premium long-grain basmati rice for daily meals and special dishes."
  },
  {
    id: "p-oil",
    name: "Cooking Oil",
    category: "Grocery",
    price: 249,
    stock: 55,
    image: "box",
    imageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=80",
    description: "Refined cooking oil suitable for frying, sauteing, and everyday cooking."
  },
  {
    id: "p-coffee",
    name: "Instant Coffee",
    category: "Grocery",
    price: 399,
    stock: 38,
    image: "box",
    imageUrl: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=900&q=80",
    description: "Rich instant coffee powder for quick hot and cold coffee drinks."
  },
  {
    id: "p-jeans",
    name: "Denim Jeans",
    category: "Clothes",
    price: 1499,
    stock: 28,
    image: "hoodie",
    imageUrl: "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80",
    description: "Comfort-fit denim jeans with classic styling for daily wear."
  },
  {
    id: "p-dress",
    name: "Casual Dress",
    category: "Clothes",
    price: 1799,
    stock: 18,
    image: "hoodie",
    imageUrl: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=80",
    description: "Stylish casual dress for outings, events, and regular use."
  },
  {
    id: "p-phone",
    name: "Smartphone",
    category: "Electronic Gadgets",
    price: 15999,
    stock: 12,
    image: "box",
    imageUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80",
    description: "Feature-rich smartphone with sharp display and fast performance."
  },
  {
    id: "p-earbuds",
    name: "Wireless Earbuds",
    category: "Electronic Gadgets",
    price: 1999,
    stock: 30,
    image: "headphones",
    imageUrl: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=900&q=80",
    description: "Compact true wireless earbuds with charging case and clear audio."
  },
  {
    id: "p-nike-shoes",
    name: "Nike Running Shoes",
    category: "Footwear",
    price: 4499,
    stock: 15,
    image: "shoes",
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
    description: "Sporty running shoes inspired by Nike-style athletic footwear."
  },
  {
    id: "p-sandals",
    name: "Comfort Sandals",
    category: "Footwear",
    price: 899,
    stock: 34,
    image: "shoes",
    imageUrl: "https://images.unsplash.com/photo-1603487742131-4160ec999306?auto=format&fit=crop&w=900&q=80",
    description: "Comfortable sandals for casual outdoor and daily use."
  },
  {
    id: "p-mixer",
    name: "Mixer Grinder",
    category: "Home Appliances",
    price: 2999,
    stock: 14,
    image: "box",
    imageUrl: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=900&q=80",
    description: "Powerful mixer grinder for chutney, masala, and kitchen preparation."
  },
  {
    id: "p-iron",
    name: "Steam Iron",
    category: "Home Appliances",
    price: 1299,
    stock: 20,
    image: "box",
    imageUrl: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=900&q=80",
    description: "Steam iron with non-stick soleplate for neat wrinkle-free clothes."
  }
];

function id() {
  return crypto.randomBytes(8).toString("hex");
}

async function connectDb() {
  mongoClient = new MongoClient(MONGODB_URI);
  await mongoClient.connect();
  db = mongoClient.db(DB_NAME);
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("products").createIndex({ id: 1 }, { unique: true });
  await db.collection("carts").createIndex({ userId: 1, productId: 1 }, { unique: true });
  await db.collection("orders").createIndex({ createdAt: -1 });
  await seedDatabase();
}

function collections() {
  return {
    users: db.collection("users"),
    products: db.collection("products"),
    carts: db.collection("carts"),
    orders: db.collection("orders")
  };
}

async function seedDatabase() {
  const { products } = collections();
  for (const product of seedProducts) {
    await products.updateOne(
      { id: product.id },
      { $set: product, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
  }
}

async function getStoreSnapshot() {
  const { users, products, carts, orders } = collections();
  return {
    users: await users.find({}).sort({ name: 1 }).toArray(),
    products: await products.find({}).sort({ category: 1, name: 1 }).toArray(),
    carts: await carts.find({}).toArray(),
    orders: await orders.find({}).sort({ createdAtValue: -1 }).toArray()
  };
}

async function getCartItems(userId) {
  const { carts, products } = collections();
  const cart = await carts.find({ userId }).toArray();
  const productIds = cart.map((entry) => entry.productId);
  const productList = await products.find({ id: { $in: productIds } }).toArray();
  return cart.map((entry) => {
    const product = productList.find((item) => item.id === entry.productId);
    return product ? { ...product, quantity: entry.quantity } : null;
  }).filter(Boolean);
}

function parseCookies(req) {
  const raw = req.headers.cookie || "";
  return Object.fromEntries(
    raw.split(";").filter(Boolean).map((cookie) => {
      const index = cookie.indexOf("=");
      return [cookie.slice(0, index).trim(), decodeURIComponent(cookie.slice(index + 1))];
    })
  );
}

function getSession(req) {
  const sid = parseCookies(req).sid;
  return sid ? sessions.get(sid) : null;
}

function createSession(res, payload) {
  const sid = id();
  sessions.set(sid, payload);
  res.setHeader("Set-Cookie", `sid=${encodeURIComponent(sid)}; HttpOnly; Path=/; SameSite=Lax`);
}

function clearSession(req, res) {
  const sid = parseCookies(req).sid;
  if (sid) sessions.delete(sid);
  res.setHeader("Set-Cookie", "sid=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

function filterProducts(products, query) {
  const term = String(query || "").trim().toLowerCase();
  if (!term) return products;
  return products.filter((product) => {
    return [product.name, product.category, product.description]
      .some((value) => String(value || "").toLowerCase().includes(term));
  });
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 1_000_000) req.destroy();
    });
    req.on("end", () => {
      const params = new URLSearchParams(body);
      resolve(Object.fromEntries(params.entries()));
    });
  });
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

function send(res, html, status = 200) {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

function serveStatic(req, res) {
  const filePath = path.normalize(path.join(PUBLIC_DIR, req.url.replace("/public/", "")));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return true;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return false;
  const ext = path.extname(filePath).toLowerCase();
  const types = { ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg" };
  res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

function layout({ title, session, body }) {
  const isAdmin = session?.role === "admin";
  const isClient = session?.role === "client";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | ShopEase</title>
  <link rel="stylesheet" href="/public/styles.css">
</head>
<body>
  <header class="topbar">
    <a class="brand" href="/">ShopEase</a>
    <nav>
      ${isAdmin ? `<a href="/admin/dashboard">Dashboard</a><a href="/admin/products">Products</a><a href="/admin/orders">Orders</a>` : ""}
      ${isClient ? `<a href="/products">Products</a><a href="/cart">Cart</a><a href="/orders">My Orders</a>` : ""}
      ${!session ? `<a href="/login">Client Login</a><a href="/register">Register</a><a href="/admin/login">Admin</a>` : `<span class="hello">${escapeHtml(session.name || "Admin")}</span><a class="button tiny" href="/logout">Logout</a>`}
    </nav>
  </header>
  <main>${body}</main>
  <footer>Acmegrade Full Stack Web Development Internship Project</footer>
</body>
</html>`;
}

function hero(session) {
  const cta = session?.role === "admin"
    ? `<a class="button primary" href="/admin/dashboard">Open Admin Panel</a>`
    : `<a class="button primary" href="/products">Shop Products</a>`;
  return `<section class="hero">
    <div class="hero-copy">
      <p class="eyebrow">E-commerce project modules</p>
      <h1>ShopEase</h1>
      <p>A complete mini e-commerce system with admin product management, client cart, order placement, and MongoDB storage.</p>
      <div class="actions">${cta}<a class="button" href="/admin/login">Admin Login</a></div>
    </div>
    <div class="hero-visual" aria-label="Product collage">
      <div class="tile headphones"></div>
      <div class="tile hoodie"></div>
      <div class="tile lamp"></div>
      <div class="tile shoes"></div>
    </div>
  </section>
  <section class="module-band">
    <article><strong>Admin</strong><span>Login, add products, view products, delete products, view orders.</span></article>
    <article><strong>Client</strong><span>Register, login, view products, cart, delete cart, place order.</span></article>
  </section>`;
}

function productArt(product) {
  if (product?.imageUrl) {
    return `<div class="product-art has-photo"><img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.name)}"></div>`;
  }
  return `<div class="product-art ${escapeHtml(product?.image || product || "box")}"><span></span></div>`;
}

function searchForm({ action, query, placeholder = "Search products" }) {
  return `<form class="search-panel" method="get" action="${escapeHtml(action)}">
    <input type="search" name="q" value="${escapeHtml(query || "")}" placeholder="${escapeHtml(placeholder)}" aria-label="Search products">
    <button class="button primary" type="submit">Search</button>
    ${query ? `<a class="button" href="${escapeHtml(action)}">Clear</a>` : ""}
  </form>`;
}

function productCards(products, session) {
  if (!products.length) return `<div class="empty">No products are available right now.</div>`;
  const grouped = categories
    .map((category) => ({
      category,
      products: products.filter((product) => product.category === category)
    }))
    .filter((group) => group.products.length);
  return `<div class="category-sections">${grouped.map((group) => `
    <section class="category-section">
      <div class="category-heading"><h2>${escapeHtml(group.category)}</h2><span>${group.products.length} products</span></div>
      <div class="product-grid">${group.products.map((product) => `
    <article class="product-card">
      ${productArt(product)}
      <div class="product-info">
        <div class="meta-row"><span>${escapeHtml(product.category)}</span><span>${escapeHtml(product.stock)} in stock</span></div>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.description)}</p>
        <div class="price-row">
          <strong>${money(product.price)}</strong>
          ${session?.role === "client" ? `
          <form method="post" action="/cart/add">
            <input type="hidden" name="productId" value="${escapeHtml(product.id)}">
            <button class="button primary small" type="submit">Add to Cart</button>
          </form>` : ""}
        </div>
      </div>
    </article>`).join("")}</div>
    </section>`).join("")}</div>`;
}

function requireRole(req, res, role) {
  const session = getSession(req);
  if (!session || session.role !== role) {
    redirect(res, role === "admin" ? "/admin/login" : "/login");
    return null;
  }
  return session;
}

function loginForm({ action, title, subtitle, error, registerLink = false }) {
  return `<section class="auth-shell">
    <form class="panel auth-card" method="post" action="${action}">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(subtitle)}</p>
      ${error ? `<div class="alert">${escapeHtml(error)}</div>` : ""}
      <label>Email<input type="email" name="email" required placeholder="Enter email"></label>
      <label>Password<input type="password" name="password" required placeholder="Enter password"></label>
      <button class="button primary full" type="submit">Login</button>
      ${registerLink ? `<a class="text-link" href="/register">Create a client account</a>` : `<div class="hint">Admin demo: admin@shop.com / admin123</div>`}
    </form>
  </section>`;
}

function registerForm(error) {
  return `<section class="auth-shell">
    <form class="panel auth-card" method="post" action="/register">
      <h1>Client Register</h1>
      <p>Create an account to add products to cart and place orders.</p>
      ${error ? `<div class="alert">${escapeHtml(error)}</div>` : ""}
      <label>Name<input name="name" required placeholder="Enter full name"></label>
      <label>Email<input type="email" name="email" required placeholder="Enter email"></label>
      <label>Password<input type="password" name="password" required minlength="4" placeholder="Create password"></label>
      <button class="button primary full" type="submit">Register</button>
      <a class="text-link" href="/login">Already have an account?</a>
    </form>
  </section>`;
}

function adminDashboard(store, session) {
  return layout({
    title: "Admin Dashboard",
    session,
    body: `<section class="page-head"><h1>Admin Dashboard</h1><p>Manage products and view customer orders.</p></section>
    <section class="stats">
      <article><span>Total Products</span><strong>${store.products.length}</strong></article>
      <article><span>Total Orders</span><strong>${store.orders.length}</strong></article>
      <article><span>Registered Clients</span><strong>${store.users.length}</strong></article>
    </section>
    <section class="quick-actions">
      <a class="button primary" href="/admin/products/new">Add Products</a>
      <a class="button" href="/admin/products">View Products</a>
      <a class="button" href="/admin/orders">View Orders</a>
    </section>`
  });
}

function productForm(session, error) {
  return layout({
    title: "Add Product",
    session,
    body: `<section class="page-head"><h1>Add Product</h1><p>Enter product details for the customer store.</p></section>
    <form class="panel form-grid" method="post" action="/admin/products/new">
      ${error ? `<div class="alert wide">${escapeHtml(error)}</div>` : ""}
      <label>Product Name<input name="name" required placeholder="Example: Smart Watch"></label>
      <label>Category<select name="category">${categories.map((category) => `<option>${category}</option>`).join("")}</select></label>
      <label>Price<input type="number" min="1" name="price" required placeholder="999"></label>
      <label>Stock<input type="number" min="0" name="stock" required placeholder="10"></label>
      <label>Image Style<select name="image"><option value="box">General Product</option><option value="headphones">Headphones</option><option value="hoodie">Clothes</option><option value="lamp">Home Appliance</option><option value="shoes">Footwear</option></select></label>
      <label class="wide">Product Image URL<input type="url" name="imageUrl" placeholder="https://example.com/product-photo.jpg"></label>
      <label class="wide">Description<textarea name="description" required rows="4" placeholder="Short product description"></textarea></label>
      <button class="button primary" type="submit">Save Product</button>
      <a class="button" href="/admin/products">Cancel</a>
    </form>`
  });
}

function adminProducts(store, session, query = "") {
  const products = filterProducts(store.products, query);
  return layout({
    title: "Admin Products",
    session,
    body: `<section class="page-head with-action"><div><h1>View Products</h1><p>Products added by admin can be deleted from here.</p></div><a class="button primary" href="/admin/products/new">Add Product</a></section>
    ${searchForm({ action: "/admin/products", query })}
    <section class="panel table-wrap">
      <table>
        <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Action</th></tr></thead>
        <tbody>${products.map((product) => `
          <tr>
            <td><div class="table-product">${productArt(product)}<span>${escapeHtml(product.name)}</span></div></td>
            <td>${escapeHtml(product.category)}</td>
            <td>${money(product.price)}</td>
            <td>${escapeHtml(product.stock)}</td>
            <td><form method="post" action="/admin/products/delete"><input type="hidden" name="productId" value="${escapeHtml(product.id)}"><button class="danger" type="submit">Delete</button></form></td>
          </tr>`).join("") || `<tr><td colspan="5" class="empty">No matching products found.</td></tr>`}</tbody>
      </table>
    </section>`
  });
}

function adminOrders(store, session) {
  return layout({
    title: "View Orders",
    session,
    body: `<section class="page-head"><h1>View Orders</h1><p>All client orders placed from the store.</p></section>
    <section class="orders">${store.orders.map((order) => `
      <article class="panel order-card">
        <div class="order-head"><div><strong>Order #${escapeHtml(order.id.slice(0, 8))}</strong><span>${escapeHtml(order.customerName)} - ${escapeHtml(order.customerEmail)}</span></div><b>${money(order.total)}</b></div>
        <ul>${order.items.map((item) => `<li><span>${escapeHtml(item.name)} x ${escapeHtml(item.quantity)}</span><span>${money(item.price * item.quantity)}</span></li>`).join("")}</ul>
        <small>Placed on ${escapeHtml(order.createdAt)}</small>
      </article>`).join("") || `<div class="empty">No orders placed yet.</div>`}</section>`
  });
}

function cartPage(items, session) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return layout({
    title: "View Cart",
    session,
    body: `<section class="page-head"><h1>View Cart</h1><p>Review products before placing the order.</p></section>
    <section class="panel table-wrap">
      <table>
        <thead><tr><th>Product</th><th>Price</th><th>Quantity</th><th>Total</th><th>Action</th></tr></thead>
        <tbody>${items.map((item) => `
          <tr>
            <td><div class="table-product">${productArt(item)}<span>${escapeHtml(item.name)}</span></div></td>
            <td>${money(item.price)}</td>
            <td>${escapeHtml(item.quantity)}</td>
            <td>${money(item.price * item.quantity)}</td>
            <td><form method="post" action="/cart/delete"><input type="hidden" name="productId" value="${escapeHtml(item.id)}"><button class="danger" type="submit">Delete Cart</button></form></td>
          </tr>`).join("") || `<tr><td colspan="5" class="empty">Your cart is empty.</td></tr>`}</tbody>
      </table>
      <div class="cart-summary"><strong>Total: ${money(total)}</strong><form method="post" action="/order/place"><button class="button primary" ${items.length ? "" : "disabled"} type="submit">Place Order</button></form></div>
    </section>`
  });
}

function clientOrders(store, session) {
  const orders = store.orders.filter((order) => order.userId === session.userId);
  return layout({
    title: "My Orders",
    session,
    body: `<section class="page-head"><h1>My Orders</h1><p>Orders placed through your client account.</p></section>
    <section class="orders">${orders.map((order) => `
      <article class="panel order-card">
        <div class="order-head"><strong>Order #${escapeHtml(order.id.slice(0, 8))}</strong><b>${money(order.total)}</b></div>
        <ul>${order.items.map((item) => `<li><span>${escapeHtml(item.name)} x ${escapeHtml(item.quantity)}</span><span>${money(item.price * item.quantity)}</span></li>`).join("")}</ul>
        <small>Placed on ${escapeHtml(order.createdAt)}</small>
      </article>`).join("") || `<div class="empty">No orders placed yet.</div>`}</section>`
  });
}

async function handlePost(req, res, pathname) {
  const body = await parseBody(req);
  const { users, products, carts, orders } = collections();

  if (pathname === "/admin/login") {
    if (body.email === adminCredentials.email && body.password === adminCredentials.password) {
      createSession(res, { role: "admin", name: "Admin" });
      redirect(res, "/admin/dashboard");
    } else {
      send(res, layout({ title: "Admin Login", session: null, body: loginForm({ action: "/admin/login", title: "Admin Login", subtitle: "Access the product and order management panel.", error: "Invalid admin email or password." }) }));
    }
    return;
  }

  if (pathname === "/register") {
    const email = String(body.email || "").trim().toLowerCase();
    const exists = await users.findOne({ email });
    if (exists) {
      send(res, layout({ title: "Client Register", session: null, body: registerForm("This email is already registered.") }));
      return;
    }
    const user = { id: id(), name: body.name.trim(), email, password: body.password, createdAt: new Date() };
    await users.insertOne(user);
    createSession(res, { role: "client", userId: user.id, name: user.name, email: user.email });
    redirect(res, "/products");
    return;
  }

  if (pathname === "/login") {
    const email = String(body.email || "").trim().toLowerCase();
    const user = await users.findOne({ email, password: body.password });
    if (!user) {
      send(res, layout({ title: "Client Login", session: null, body: loginForm({ action: "/login", title: "Client Login", subtitle: "Login to view products, cart, and orders.", error: "Invalid email or password.", registerLink: true }) }));
      return;
    }
    createSession(res, { role: "client", userId: user.id, name: user.name, email: user.email });
    redirect(res, "/products");
    return;
  }

  if (pathname === "/admin/products/new") {
    const session = requireRole(req, res, "admin");
    if (!session) return;
    if (!body.name || Number(body.price) <= 0) {
      send(res, productForm(session, "Please enter a valid product name and price."));
      return;
    }
    await products.insertOne({
      id: id(),
      name: body.name.trim(),
      category: body.category,
      price: Number(body.price),
      stock: Number(body.stock || 0),
      image: body.image || "box",
      imageUrl: String(body.imageUrl || "").trim(),
      description: body.description.trim(),
      createdAt: new Date()
    });
    redirect(res, "/admin/products");
    return;
  }

  if (pathname === "/admin/products/delete") {
    const session = requireRole(req, res, "admin");
    if (!session) return;
    await products.deleteOne({ id: body.productId });
    await carts.deleteMany({ productId: body.productId });
    redirect(res, "/admin/products");
    return;
  }

  if (pathname === "/cart/add") {
    const session = requireRole(req, res, "client");
    if (!session) return;
    const product = await products.findOne({ id: body.productId });
    if (product) {
      await carts.updateOne(
        { userId: session.userId, productId: product.id },
        { $inc: { quantity: 1 }, $setOnInsert: { id: id(), userId: session.userId, productId: product.id, createdAt: new Date() } },
        { upsert: true }
      );
    }
    redirect(res, "/cart");
    return;
  }

  if (pathname === "/cart/delete") {
    const session = requireRole(req, res, "client");
    if (!session) return;
    await carts.deleteOne({ userId: session.userId, productId: body.productId });
    redirect(res, "/cart");
    return;
  }

  if (pathname === "/order/place") {
    const session = requireRole(req, res, "client");
    if (!session) return;
    const items = await getCartItems(session.userId);
    if (items.length) {
      const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const now = new Date();
      await orders.insertOne({
        id: id(),
        userId: session.userId,
        customerName: session.name,
        customerEmail: session.email,
        items: items.map((item) => ({ productId: item.id, name: item.name, price: item.price, quantity: item.quantity })),
        total,
        createdAt: now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        createdAtValue: now
      });
      await carts.deleteMany({ userId: session.userId });
    }
    redirect(res, "/orders");
    return;
  }

  send(res, "Not Found", 404);
}

async function router(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    const session = getSession(req);

    if (pathname.startsWith("/public/") && serveStatic(req, res)) return;
    if (req.method === "POST") return handlePost(req, res, pathname);

    const store = await getStoreSnapshot();

    if (pathname === "/") return send(res, layout({ title: "Home", session, body: hero(session) }));
    if (pathname === "/logout") {
      clearSession(req, res);
      return redirect(res, "/");
    }
    if (pathname === "/admin/login") return send(res, layout({ title: "Admin Login", session: null, body: loginForm({ action: "/admin/login", title: "Admin Login", subtitle: "Access the product and order management panel." }) }));
    if (pathname === "/register") return send(res, layout({ title: "Client Register", session: null, body: registerForm() }));
    if (pathname === "/login") return send(res, layout({ title: "Client Login", session: null, body: loginForm({ action: "/login", title: "Client Login", subtitle: "Login to view products, cart, and orders.", registerLink: true }) }));

    if (pathname === "/admin/dashboard") {
      const admin = requireRole(req, res, "admin");
      if (!admin) return;
      return send(res, adminDashboard(store, admin));
    }
    if (pathname === "/admin/products") {
      const admin = requireRole(req, res, "admin");
      if (!admin) return;
      const query = url.searchParams.get("q") || "";
      return send(res, adminProducts(store, admin, query));
    }
    if (pathname === "/admin/products/new") {
      const admin = requireRole(req, res, "admin");
      if (!admin) return;
      return send(res, productForm(admin));
    }
    if (pathname === "/admin/orders") {
      const admin = requireRole(req, res, "admin");
      if (!admin) return;
      return send(res, adminOrders(store, admin));
    }
    if (pathname === "/products") {
      const client = requireRole(req, res, "client");
      if (!client) return;
      const query = url.searchParams.get("q") || "";
      const products = filterProducts(store.products, query);
      return send(res, layout({ title: "View Products", session: client, body: `<section class="page-head"><h1>View Products</h1><p>Add products to cart and place an order.</p></section>${searchForm({ action: "/products", query, placeholder: "Search by product name or category" })}${productCards(products, client)}` }));
    }
    if (pathname === "/cart") {
      const client = requireRole(req, res, "client");
      if (!client) return;
      const items = await getCartItems(client.userId);
      return send(res, cartPage(items, client));
    }
    if (pathname === "/orders") {
      const client = requireRole(req, res, "client");
      if (!client) return;
      return send(res, clientOrders(store, client));
    }

    send(res, layout({ title: "Not Found", session, body: `<section class="page-head"><h1>Page Not Found</h1><p>The requested page does not exist.</p></section>` }), 404);
  } catch (error) {
    console.error(error);
    send(res, layout({ title: "Server Error", session: null, body: `<section class="page-head"><h1>Server Error</h1><p>Please check MongoDB connection and restart the project.</p></section>` }), 500);
  }
}

async function start() {
  await connectDb();
  http.createServer(router).listen(PORT, () => {
    console.log(`ShopEase running at http://localhost:${PORT}`);
    console.log(`MongoDB database: ${DB_NAME}`);
  });
}

start().catch((error) => {
  console.error("Unable to start project. Please check MongoDB connection.");
  console.error(error.message);
  process.exit(1);
});
