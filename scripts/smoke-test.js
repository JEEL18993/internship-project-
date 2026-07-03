const { spawn } = require("child_process");
const http = require("http");
const assert = require("assert");
const { MongoClient } = require("mongodb");

const PORT = 3100;
const BASE = `http://localhost:${PORT}`;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const DB_NAME = `shopease_test_${Date.now()}`;

const server = spawn(process.execPath, ["server.js"], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(PORT), MONGODB_URI, DB_NAME },
  stdio: ["ignore", "pipe", "pipe"]
});

let serverOutput = "";
server.stdout.on("data", (chunk) => {
  serverOutput += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  serverOutput += chunk.toString();
});

function request(method, pathname, form, cookie) {
  const body = form ? new URLSearchParams(form).toString() : "";
  return new Promise((resolve, reject) => {
    const req = http.request(`${BASE}${pathname}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(body) } : {}),
        ...(cookie ? { Cookie: cookie } : {})
      }
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk.toString();
      });
      res.on("end", () => {
        resolve({ status: res.statusCode, headers: res.headers, body: data });
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function cookieFrom(response) {
  return (response.headers["set-cookie"] || []).map((item) => item.split(";")[0]).join("; ");
}

async function waitForServer() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 10000) {
    try {
      const response = await request("GET", "/");
      if (response.status === 200) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw new Error(`Server did not start. Output: ${serverOutput}`);
}

async function cleanup() {
  server.kill();
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    await client.db(DB_NAME).dropDatabase();
  } catch {
    // The main test failure will show the useful error.
  } finally {
    await client.close().catch(() => {});
  }
}

(async () => {
  try {
    await waitForServer();

    const home = await request("GET", "/");
    assert.equal(home.status, 200);
    assert.match(home.body, /ShopEase/);

    const adminLogin = await request("POST", "/admin/login", {
      email: "admin@shop.com",
      password: "admin123"
    });
    assert.equal(adminLogin.status, 302);
    const adminCookie = cookieFrom(adminLogin);

    const adminProducts = await request("GET", "/admin/products", null, adminCookie);
    assert.equal(adminProducts.status, 200);
    assert.match(adminProducts.body, /Smart Watch/);
    assert.match(adminProducts.body, /type="search"/);
    assert.match(adminProducts.body, /images\.unsplash\.com/);

    const adminSearch = await request("GET", "/admin/products?q=watch", null, adminCookie);
    assert.equal(adminSearch.status, 200);
    assert.match(adminSearch.body, /Smart Watch/);

    const unique = Date.now();
    const register = await request("POST", "/register", {
      name: "Smoke Test User",
      email: `smoke${unique}@example.com`,
      password: "test123"
    });
    assert.equal(register.status, 302);
    const clientCookie = cookieFrom(register);

    const products = await request("GET", "/products", null, clientCookie);
    assert.equal(products.status, 200);
    assert.match(products.body, /Add to Cart/);
    assert.match(products.body, /type="search"/);
    assert.match(products.body, /Grocery/);
    assert.match(products.body, /Electronic Gadgets/);
    assert.match(products.body, /Footwear/);

    const productSearch = await request("GET", "/products?q=shoes", null, clientCookie);
    assert.equal(productSearch.status, 200);
    assert.match(productSearch.body, /Training Shoes/);

    const productId = products.body.match(/name="productId" value="([^"]+)"/)[1];
    const addCart = await request("POST", "/cart/add", { productId }, clientCookie);
    assert.equal(addCart.status, 302);

    const cart = await request("GET", "/cart", null, clientCookie);
    assert.equal(cart.status, 200);
    assert.match(cart.body, /Place Order/);

    const order = await request("POST", "/order/place", {}, clientCookie);
    assert.equal(order.status, 302);

    const orders = await request("GET", "/admin/orders", null, adminCookie);
    assert.equal(orders.status, 200);
    assert.match(orders.body, /Smoke Test User/);

    console.log("Smoke test passed: MongoDB, admin login, products, client register, cart, and order modules work.");
  } finally {
    await cleanup();
  }
})().catch(async (error) => {
  await cleanup();
  console.error(error);
  process.exit(1);
});
