import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import pg from "pg";

const { Pool } = pg;

const PORT = Number(process.env.PORT) || 3000;

function getDatabasePath(): string {
  let targetPath = process.env.DB_PATH;
  if (targetPath) {
    // If the path is set to the system root, redirect to the project's directory
    if (targetPath === "/db.json" || targetPath === "db.json") {
      targetPath = path.join(process.cwd(), "db.json");
    }
  } else {
    targetPath = path.join(process.cwd(), "db.json");
  }

  try {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.accessSync(dir, fs.constants.W_OK);
    return targetPath;
  } catch (e) {
    console.warn(`Chosen path ${targetPath} is not writable. Falling back to /tmp/db.json for serverless compatibility.`);
    return "/tmp/db.json";
  }
}

const DB_FILE = getDatabasePath();

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  createdAt: string;
}

interface Database {
  products: Product[];
  customers: Customer[];
  orders: Order[];
}

// Initial seed data
const initialData: Database = {
  products: [
    { id: "p1", name: "Ergonomic Office Chair", sku: "CHAIR-001", price: 249.99, quantity: 45 },
    { id: "p2", name: "Mechanical Keyboard", sku: "KEY-002", price: 129.99, quantity: 120 },
    { id: "p3", name: "UltraWide Monitor 34\"", sku: "MON-003", price: 449.99, quantity: 8 },
    { id: "p4", name: "Noise-Cancelling Headphones", sku: "AUD-004", price: 199.99, quantity: 32 },
    { id: "p5", name: "USB-C Multiport Hub", sku: "HUB-005", price: 59.99, quantity: 4 }
  ],
  customers: [
    { id: "c1", name: "Sarah Connor", email: "sarah@sky.net", phone: "555-0199" },
    { id: "c2", name: "Marcus Wright", email: "marcus@cyberdyne.org", phone: "555-0142" },
    { id: "c3", name: "John Connor", email: "john@resistance.io", phone: "555-0101" }
  ],
  orders: [
    {
      id: "o1",
      customerId: "c1",
      customerName: "Sarah Connor",
      items: [
        { productId: "p1", productName: "Ergonomic Office Chair", price: 249.99, quantity: 1 },
        { productId: "p4", productName: "Noise-Cancelling Headphones", price: 199.99, quantity: 2 }
      ],
      totalAmount: 649.97,
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() // 2 days ago
    },
    {
      id: "o2",
      customerId: "c3",
      customerName: "John Connor",
      items: [
        { productId: "p2", productName: "Mechanical Keyboard", price: 129.99, quantity: 1 }
      ],
      totalAmount: 129.99,
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() // 12 hours ago
    }
  ]
};

// Database helper functions
let dbCache: Database | null = null;
let pool: pg.Pool | null = null;

if (process.env.DATABASE_URL) {
  console.log("DATABASE_URL detected. Setting up PostgreSQL Pool with Neon...");
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
}

function loadDbFromFile(): Database {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content) as Database;
    }
  } catch (error) {
    console.error("Error reading database file, using seeds:", error);
  }
  
  // Write initial data if DB file doesn't exist
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf-8");
  } catch (writeErr) {
    console.error("Error creating local fallback db.json seed:", writeErr);
  }
  return initialData;
}

async function initPostgres(): Promise<void> {
  if (!pool) {
    console.log("No DATABASE_URL configured. Server will run on local file JSON database.");
    dbCache = loadDbFromFile();
    return;
  }

  try {
    console.log("Initializing Neon PostgreSQL storage table if not exists...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_state (
        key VARCHAR(50) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const res = await pool.query("SELECT data FROM app_state WHERE key = 'main_db';");
    if (res.rows.length === 0) {
      console.log("Seeding Neon PostgreSQL with initial data...");
      await pool.query(
        "INSERT INTO app_state (key, data) VALUES ('main_db', $1);",
        [JSON.stringify(initialData)]
      );
      dbCache = initialData;
    } else {
      console.log("Database state fetched from Neon PostgreSQL successfully.");
      dbCache = res.rows[0].data as Database;
    }
  } catch (err) {
    console.error("Failed to connect or initialize Neon PostgreSQL! Falling back to file DB:", err);
    pool = null; // Mark fallback
    dbCache = loadDbFromFile();
  }
}

function loadDb(): Database {
  if (dbCache) {
    return dbCache;
  }
  dbCache = loadDbFromFile();
  return dbCache;
}

function saveDb(data: Database): void {
  dbCache = data; // Instantly write cache so next GET matches current mutations
  
  if (pool) {
    // Non-blocking write to Neon PostgreSQL in the background
    pool.query(
      `INSERT INTO app_state (key, data, updated_at)
       VALUES ('main_db', $1, CURRENT_TIMESTAMP)
       ON CONFLICT (key)
       DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at;`,
      [JSON.stringify(data)]
    ).catch(err => {
      console.error("Failed to persist update asynchronously to Neon PostgreSQL:", err);
    });
  } else {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (error) {
      console.error("Error writing database file:", error);
    }
  }
}

async function startServer() {
  const app = express();
  
  // Robust CORS configuration to dynamically echo the requesting origin
  app.use(cors({
    origin: (origin, callback) => {
      // If there is no origin (e.g. mobile apps, curl, server-to-server), allow it
      if (!origin) return callback(null, true);
      callback(null, origin);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Origin", "Accept", "X-Requested-With"],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
  }));

  app.use(express.json());

  // Initialize DB before routing requests
  await initPostgres();

  // API Routes
  
  // 1. PRODUCTS
  
  // GET /api/products - Get all products
  app.get("/api/products", (req, res) => {
    const db = loadDb();
    res.json(db.products);
  });

  // GET /api/products/:id - Get specific product
  app.get("/api/products/:id", (req, res) => {
    const db = loadDb();
    const product = db.products.find(p => p.id === req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  });

  // POST /api/products - Create a product
  app.post("/api/products", (req, res) => {
    const { name, sku, price, quantity } = req.body;
    
    // Server validation
    if (!name || !sku || price === undefined || quantity === undefined) {
      return res.status(400).json({ error: "Missing required fields: name, sku, price, quantity" });
    }

    if (price < 0) {
      return res.status(400).json({ error: "Product price cannot be negative" });
    }

    if (quantity < 0) {
      return res.status(400).json({ error: "Product quantity cannot be negative" });
    }

    const db = loadDb();
    
    // Uniqueness validation on SKU
    const isSkuDuplicate = db.products.some(p => p.sku.toUpperCase() === sku.toUpperCase());
    if (isSkuDuplicate) {
      return res.status(400).json({ error: `Product SKU / code '${sku}' is already in use` });
    }

    const newProduct: Product = {
      id: "p_" + Math.random().toString(36).substr(2, 9),
      name: String(name).trim(),
      sku: String(sku).trim().toUpperCase(),
      price: Number(price),
      quantity: Math.floor(Number(quantity))
    };

    db.products.push(newProduct);
    saveDb(db);
    res.status(201).json(newProduct);
  });

  // PUT /api/products/:id - Update product
  app.put("/api/products/:id", (req, res) => {
    const { name, sku, price, quantity } = req.body;
    
    if (!name || !sku || price === undefined || quantity === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (price < 0) {
      return res.status(400).json({ error: "Price cannot be negative" });
    }

    if (quantity < 0) {
      return res.status(400).json({ error: "Quantity cannot be negative" });
    }

    const db = loadDb();
    const index = db.products.findIndex(p => p.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: "Product not found" });
    }

    // SKU unique except for itself
    const isSkuDuplicate = db.products.some(p => p.id !== req.params.id && p.sku.toUpperCase() === sku.toUpperCase());
    if (isSkuDuplicate) {
      return res.status(400).json({ error: `Product SKU '${sku}' is already in use by another product` });
    }

    const updatedProduct: Product = {
      ...db.products[index],
      name: String(name).trim(),
      sku: String(sku).trim().toUpperCase(),
      price: Number(price),
      quantity: Math.floor(Number(quantity))
    };

    db.products[index] = updatedProduct;
    saveDb(db);
    res.json(updatedProduct);
  });

  // DELETE /api/products/:id - Delete product
  app.delete("/api/products/:id", (req, res) => {
    const db = loadDb();
    const productExists = db.products.some(p => p.id === req.params.id);
    if (!productExists) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Optional constraint: Avoid deleting if referenced in existing orders
    const isReferencedInOrders = db.orders.some(order => 
      order.items.some(item => item.productId === req.params.id)
    );
    if (isReferencedInOrders) {
      return res.status(400).json({ error: "Cannot delete this product as it is referenced in past orders" });
    }

    db.products = db.products.filter(p => p.id !== req.params.id);
    saveDb(db);
    res.status(200).json({ success: true, message: "Product deleted successfully" });
  });

  // 2. CUSTOMERS
  
  // GET /api/customers - Get all customers
  app.get("/api/customers", (req, res) => {
    const db = loadDb();
    res.json(db.customers);
  });

  // GET /api/customers/:id - Get specific customer
  app.get("/api/customers/:id", (req, res) => {
    const db = loadDb();
    const customer = db.customers.find(c => c.id === req.params.id);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.json(customer);
  });

  // POST /api/customers - Create customer
  app.post("/api/customers", (req, res) => {
    const { name, email, phone } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({ error: "Missing required fields: name, email, phone" });
    }

    const db = loadDb();

    // Unique email check
    const isEmailDuplicate = db.customers.some(c => c.email.toLowerCase() === email.toLowerCase());
    if (isEmailDuplicate) {
      return res.status(400).json({ error: `Customer with email '${email}' already exists` });
    }

    const newCustomer: Customer = {
      id: "c_" + Math.random().toString(36).substr(2, 9),
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: String(phone).trim()
    };

    db.customers.push(newCustomer);
    saveDb(db);
    res.status(201).json(newCustomer);
  });

  // DELETE /api/customers/:id - Delete customer
  app.delete("/api/customers/:id", (req, res) => {
    const db = loadDb();
    const customerExists = db.customers.some(c => c.id === req.params.id);
    if (!customerExists) {
      return res.status(404).json({ error: "Customer not found" });
    }

    // Optional constraint: Avoid deleting if customer has existing orders
    const hasExistingOrders = db.orders.some(o => o.customerId === req.params.id);
    if (hasExistingOrders) {
      return res.status(400).json({ error: "Cannot delete this customer as they have order histories" });
    }

    db.customers = db.customers.filter(c => c.id !== req.params.id);
    saveDb(db);
    res.status(200).json({ success: true, message: "Customer deleted successfully" });
  });

  // 3. ORDERS
  
  // GET /api/orders - Get all orders
  app.get("/api/orders", (req, res) => {
    const db = loadDb();
    res.json(db.orders);
  });

  // GET /api/orders/:id - Get specific order
  app.get("/api/orders/:id", (req, res) => {
    const db = loadDb();
    const order = db.orders.find(o => o.id === req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json(order);
  });

  // POST /api/orders - Create an order
  app.post("/api/orders", (req, res) => {
    const { customerId, items } = req.body; // items: Array<{ productId: string, quantity: number }>

    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Missing customer reference or ordered products list" });
    }

    const db = loadDb();

    // Verify customer exists
    const customer = db.customers.find(c => c.id === customerId);
    if (!customer) {
      return res.status(404).json({ error: "Customer reference details not found" });
    }

    // Verify products, stock and calculate total amount
    let calculatedTotal = 0;
    const orderItems: OrderItem[] = [];

    // Temporary map of product quantities to check duplicate items in same order and aggregate quantities
    const stockChecks: Record<string, number> = {};
    for (const item of items) {
      if (!item.productId || !item.quantity || Number(item.quantity) <= 0) {
        return res.status(400).json({ error: "Each order item must contain a valid productId and quantity greater than 0" });
      }
      stockChecks[item.productId] = (stockChecks[item.productId] || 0) + Number(item.quantity);
    }

    // Check all products
    for (const [pId, requestedQty] of Object.entries(stockChecks)) {
      const product = db.products.find(p => p.id === pId);
      if (!product) {
        return res.status(404).json({ error: `Product with ID '${pId}' not found` });
      }

      if (product.quantity < requestedQty) {
        return res.status(400).json({ 
          error: `Insufficient stock for product '${product.name}'. Available: ${product.quantity}, Requested: ${requestedQty}` 
        });
      }

      calculatedTotal += product.price * requestedQty;
      orderItems.push({
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: requestedQty
      });
    }

    // Deduct stock
    for (const [pId, requestedQty] of Object.entries(stockChecks)) {
      const product = db.products.find(p => p.id === pId)!;
      product.quantity -= requestedQty;
    }

    const newOrder: Order = {
      id: "o_" + Math.random().toString(36).substr(2, 9),
      customerId: customer.id,
      customerName: customer.name,
      items: orderItems,
      totalAmount: Math.round(calculatedTotal * 100) / 100,
      createdAt: new Date().toISOString()
    };

    db.orders.push(newOrder);
    saveDb(db);
    res.status(201).json(newOrder);
  });

  // DELETE /api/orders/:id - Cancel/Delete order (and restore stock!)
  app.delete("/api/orders/:id", (req, res) => {
    const db = loadDb();
    const orderIndex = db.orders.findIndex(o => o.id === req.params.id);
    if (orderIndex === -1) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = db.orders[orderIndex];

    // Cancel order and RESTORE products quantity in stock
    for (const item of order.items) {
      const product = db.products.find(p => p.id === item.productId);
      if (product) {
        product.quantity += item.quantity;
      }
    }

    db.orders.splice(orderIndex, 1);
    saveDb(db);
    res.status(200).json({ success: true, message: "Order cancelled and stock restored successfully" });
  });

  // 4. STATS / DASHBOARD
  app.get("/api/dashboard/stats", (req, res) => {
    const db = loadDb();
    
    // Total numbers
    const totalProducts = db.products.length;
    const totalCustomers = db.customers.length;
    const totalOrders = db.orders.length;
    
    // Low stock products (quantity <= 5 is considered low stock)
    const lowStockCount = db.products.filter(p => p.quantity <= 10).length;
    
    // Total revenue
    const totalRevenue = db.orders.reduce((sum, order) => sum + order.totalAmount, 0);

    res.json({
      totalProducts,
      totalCustomers,
      totalOrders,
      lowStockCount,
      totalRevenue: Math.round(totalRevenue * 100) / 100
    });
  });

  // Serve Vite or static assets depending on environment
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
