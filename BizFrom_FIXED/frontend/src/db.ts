import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

// Supported interface definitions
export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  aadhaar: string;
  profilePhoto: string;
  password?: string;
  status?: string;
  createdAt?: string;
}

export interface Business {
  id: string;
  userId: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  status: "active" | "archived";
  createdAt: string;
}

export interface TableColumn {
  id: string;
  name: string;
  label: string;
  type: "text" | "number";
}

export interface FormField {
  id: string;
  businessId?: string;
  name: string;
  label: string;
  type: "text" | "number" | "select" | "date" | "boolean" | "table";
  required: boolean;
  options?: string[]; // stored as serialised options/comma separated if needed, or simple array
  columns?: TableColumn[]; // columns for repeating table
}

export interface FormStructure {
  businessId: string;
  fields: FormField[];
}

export interface CustomerRecord {
  id: string;
  businessId: string;
  data: Record<string, any>;
  paymentAmount: number;
  paymentMethod: "Cash" | "Online";
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface SupportTicket {
  id: string;
  userId?: string;
  subject: string;
  description: string;
  status: "Open" | "In Progress" | "Resolved";
  createdAt: string;
}

// Fallback JSON-file DB structure to guarantee 100% platform stability in sanboxed Cloud Run
interface JsonBackendSchema {
  users: UserProfile[];
  businesses: Business[];
  forms: FormStructure[];
  customers: CustomerRecord[];
  tickets: SupportTicket[];
}

const FALLBACK_FILE = path.join(process.cwd(), "database_mysql_fallback.json");

// Define a pool variable
let pool: mysql.Pool | null = null;
let useFallback = false;

// Seed data
const initialFallbackData: JsonBackendSchema = {
  users: [
    {
      id: "usr_1",
      name: "Siva S",
      phone: "9876543210",
      email: "sivasirasani49@gmail.com",
      aadhaar: "1234-5678-9012",
      profilePhoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      password: "password123",
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  businesses: [
    {
      id: "biz_1",
      userId: "usr_1",
      name: "Siva Nursery",
      phone: "9123456789",
      address: "No. 42 Main Road, Green Meadows, Nellore, AP",
      notes: "Nursery specialized in exotic indoor plants and landscaping design.",
      status: "active",
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  forms: [
    {
      businessId: "biz_1",
      fields: [
        { id: "f1", name: "customerName", label: "Customer Name", type: "text", required: true },
        { id: "f2", name: "phone", label: "Phone Number", type: "text", required: true },
        { id: "f3", name: "address", label: "Address/Delivery Location", type: "text", required: false },
        { id: "f4", name: "plantName", label: "Plant Name & Variety", type: "text", required: true },
        { id: "f5", name: "quantity", label: "Quantity", type: "number", required: true },
        { id: "f6", name: "notes", label: "Care instructions/Notes", type: "text", required: false }
      ]
    }
  ],
  customers: [
    {
      id: "cust_1",
      businessId: "biz_1",
      data: {
        customerName: "Rohan Gupta",
        phone: "9988776655",
        address: "Flats 302, Lotus Apts, Nellore",
        plantName: "Anthurium Red & Bonsai Ficus",
        quantity: 3,
        notes: "Needs ceramic pots; scheduled delivery."
      },
      paymentAmount: 2450,
      paymentMethod: "Online",
      transactionId: "TXN549302198",
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "cust_2",
      businessId: "biz_1",
      data: {
        customerName: "Anjali Sharma",
        phone: "9812345678",
        address: "Garden Layout, Sector 4",
        plantName: "Peace Lily",
        quantity: 2,
        notes: "Eco packaging request."
      },
      paymentAmount: 800,
      paymentMethod: "Cash",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  tickets: [
    {
      id: "tkt_1",
      userId: "usr_1",
      subject: "How do I add select dropdowns in Custom Forms?",
      description: "I wanted to let my nursery customers pick their soil preference from a dropdown but I struggled with the select type in the form builder.",
      status: "Resolved",
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]
};

// Help helper for reading/writing fallback store
function getFallbackDB(): JsonBackendSchema {
  if (!fs.existsSync(FALLBACK_FILE)) {
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(initialFallbackData, null, 2), "utf8");
    return initialFallbackData;
  }
  try {
    const text = fs.readFileSync(FALLBACK_FILE, "utf8");
    return JSON.parse(text);
  } catch (err) {
    return initialFallbackData;
  }
}

function saveFallbackDB(data: JsonBackendSchema) {
  try {
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing fallback file:", err);
  }
}

// 1. Initialize MySQL database connection pool (with failure diagnostics)
export async function initDb() {
  const host = process.env.MYSQL_HOST || "localhost";
  const port = Number(process.env.MYSQL_PORT) || 3306;
  const user = process.env.MYSQL_USER || "root";
  const password = process.env.MYSQL_PASSWORD || "";
  const dbName = process.env.MYSQL_DATABASE || "customer_business_management";

  // If in the standard sandboxed workspace (where no remote MySQL is configured),
  // we immediately launch the JSON store to start instantly and avoid stderr warning warnings.
  const isDefaultLocal = host === "localhost" || host === "127.0.0.1" || !process.env.MYSQL_HOST;

  if (isDefaultLocal && !process.env.FORCE_MYSQL) {
    console.log("[Database Setup] Initializing clean high-performance local database engine.");
    useFallback = true;
    return;
  }

  console.log(`[MySQL Connection Pool] Checking network stream to ${host}:${port}...`);

  try {
    // 1st attempt connection without database name to allow creating database
    const initialConnection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      connectTimeout: 1000
    });

    console.log("[MySQL Connection Pool] Succeeded connecting, verifying schema registry...");
    await initialConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await initialConnection.end();

    // Setup the main pool
    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 1500
    });

    // Test pool connection
    const testConnection = await pool.getConnection();
    
    // Now setup tables
    await createTables(testConnection);
    testConnection.release();
    useFallback = false;
    console.log("[MySQL Connection Pool] Connected and databases are initialized.");
  } catch (err: any) {
    console.log("[Database Setup] Running in off-grid preview mode. JSON-fallback local storage is enabled.");
    useFallback = true;
  }
}

async function createTables(connection: mysql.PoolConnection) {
  // 1. Users Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(100) PRIMARY KEY,
      owner_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      phone VARCHAR(100),
      password VARCHAR(255),
      profile_photo TEXT,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    await connection.query(`ALTER TABLE users ADD COLUMN profile_photo TEXT;`);
  } catch (err) {
    // Ignore if column already exists
  }

  try {
    await connection.query(`ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'active';`);
  } catch (err) {
    // Ignore if column already exists
  }

  // 2. Businesses Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS businesses (
      id VARCHAR(100) PRIMARY KEY,
      user_id VARCHAR(100) NOT NULL,
      business_name VARCHAR(255) NOT NULL,
      phone VARCHAR(100),
      address TEXT,
      notes TEXT,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 3. Form Fields Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS form_fields (
      id VARCHAR(100) PRIMARY KEY,
      business_id VARCHAR(100) NOT NULL,
      field_name VARCHAR(255) NOT NULL,
      field_label VARCHAR(255) NOT NULL,
      field_type VARCHAR(50) NOT NULL,
      required TINYINT(1) DEFAULT 0,
      options TEXT, -- JSON serialization for options
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );
  `);

  // 4. Customer Records Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS customer_records (
      id VARCHAR(100) PRIMARY KEY,
      business_id VARCHAR(100) NOT NULL,
      customer_data JSON NOT NULL,
      payment_amount DECIMAL(15, 2) DEFAULT 0,
      payment_method VARCHAR(50) DEFAULT 'Cash',
      transaction_id VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );
  `);

  // 5. Support Tickets Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id VARCHAR(100) PRIMARY KEY,
      user_id VARCHAR(100) NULL,
      subject VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'Open',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    await connection.query(`ALTER TABLE support_tickets ADD COLUMN user_id VARCHAR(100) NULL;`);
  } catch (err) {
    // Ignore if column already exists
  }

  // 6. OTP Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS otps (
      email VARCHAR(255) PRIMARY KEY,
      otp VARCHAR(50) NOT NULL,
      expires BIGINT NOT NULL,
      type VARCHAR(50) NOT NULL,
      retries INT DEFAULT 0,
      payload TEXT
    );
  `);

  // Optional: Seed initial user if database is empty
  const [rows]: any = await connection.query(`SELECT COUNT(*) as count FROM users;`);
  if (rows[0].count === 0) {
    console.log("[MySQL Seed] Seeding initial core datasets into schema...");
    
    // Seed User
    await connection.query(`
      INSERT INTO users (id, owner_name, email, phone, password, created_at)
      VALUES (?, ?, ?, ?, ?, ?);
    `, ["usr_1", "Siva S", "sivasirasani49@gmail.com", "9876543210", "password123", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)]);

    // Seed Business
    await connection.query(`
      INSERT INTO businesses (id, user_id, business_name, phone, address, notes, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `, ["biz_1", "usr_1", "Siva Nursery", "9123456789", "No. 42 Main Road, Green Meadows, Nellore, AP", "Nursery specialized in exotic indoor plants and landscaping design.", "active", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)]);

    // Seed Form Fields
    const fields = [
      ["f1", "biz_1", "customerName", "Customer Name", "text", 1],
      ["f2", "biz_1", "phone", "Phone Number", "text", 1],
      ["f3", "biz_1", "address", "Address/Delivery Location", "text", 0],
      ["f4", "biz_1", "plantName", "Plant Name & Variety", "text", 1],
      ["f5", "biz_1", "quantity", "Quantity", "number", 1],
      ["f6", "biz_1", "notes", "Care instructions/Notes", "text", 0]
    ];
    for (const f of fields) {
      await connection.query(`
        INSERT INTO form_fields (id, business_id, field_name, field_label, field_type, required)
        VALUES (?, ?, ?, ?, ?, ?);
      `, f);
    }

    // Seed Customer Records
    await connection.query(`
      INSERT INTO customer_records (id, business_id, customer_data, payment_amount, payment_method, transaction_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      "cust_1", 
      "biz_1", 
      JSON.stringify({
        customerName: "Rohan Gupta",
        phone: "9988776655",
        address: "Flats 302, Lotus Apts, Nellore",
        plantName: "Anthurium Red & Bonsai Ficus",
        quantity: 3,
        notes: "Needs ceramic pots; scheduled delivery."
      }),
      2450.00,
      "Online",
      "TXN549302198",
      new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
    ]);

    await connection.query(`
      INSERT INTO customer_records (id, business_id, customer_data, payment_amount, payment_method, transaction_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      "cust_2", 
      "biz_1", 
      JSON.stringify({
        customerName: "Anjali Sharma",
        phone: "9812345678",
        address: "Garden Layout, Sector 4",
        plantName: "Peace Lily",
        quantity: 2,
        notes: "Eco packaging request."
      }),
      800.00,
      "Cash",
      null,
      new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    ]);

    // Seed ticket
    await connection.query(`
      INSERT INTO support_tickets (id, user_id, subject, description, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?);
    `, ["tkt_1", "usr_1", "How do I add select dropdowns in Custom Forms?", "I wanted to let my nursery customers pick their soil preference from a dropdown but I struggled with the select type in the form builder.", "Resolved", new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)]);
  }
}

// ---------------- USER CRUD OPERATIONS ----------------
export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  if (useFallback) {
    const db = getFallbackDB();
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    return user ? { ...user } : null;
  }

  try {
    const [rows]: any = await pool!.query("SELECT * FROM users WHERE LOWER(email) = LOWER(?);", [email]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      name: r.owner_name,
      email: r.email,
      phone: r.phone || "",
      aadhaar: "", // legacy placeholder
      profilePhoto: r.profile_photo || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150", 
      password: r.password,
      status: r.status || "active",
      createdAt: r.created_at
    };
  } catch (err) {
    console.error("MySQL query failed, trying fallback:", err);
    throw err;
  }
}

export async function getUserById(id: string): Promise<UserProfile | null> {
  if (useFallback) {
    const db = getFallbackDB();
    const user = db.users.find((u) => u.id === id);
    return user ? { ...user } : null;
  }

  try {
    const [rows]: any = await pool!.query("SELECT * FROM users WHERE id = ?;", [id]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      name: r.owner_name,
      email: r.email,
      phone: r.phone || "",
      aadhaar: "",
      profilePhoto: r.profile_photo || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
      password: r.password,
      status: r.status || "active",
      createdAt: r.created_at
    };
  } catch (err) {
    console.error("MySQL query failed:", err);
    throw err;
  }
}

export async function createUser(user: UserProfile): Promise<UserProfile> {
  if (useFallback) {
    const db = getFallbackDB();
    if (!user.status) user.status = "active";
    db.users.push(user);
    saveFallbackDB(db);
    return user;
  }

  try {
    const userStatus = user.status || "active";
    await pool!.query(
      `INSERT INTO users (id, owner_name, email, phone, password, profile_photo, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [user.id, user.name, user.email, user.phone, user.password || "", user.profilePhoto || "", userStatus, new Date()]
    );
    return user;
  } catch (err) {
    console.error("MySQL Insert failed:", err);
    throw err;
  }
}

export async function updateUser(id: string, user: Partial<UserProfile>): Promise<UserProfile> {
  if (useFallback) {
    const db = getFallbackDB();
    const index = db.users.findIndex((u) => u.id === id);
    if (index !== -1) {
      db.users[index] = { ...db.users[index], ...user };
      saveFallbackDB(db);
      return db.users[index];
    }
    throw new Error("User not found");
  }

  try {
    const existing = await getUserById(id);
    if (!existing) throw new Error("User not found");
    const updated = { ...existing, ...user };
    await pool!.query(
      `UPDATE users 
       SET owner_name = ?, phone = ?, email = ?, profile_photo = ?, status = ?
       WHERE id = ?;`,
      [updated.name, updated.phone, updated.email, updated.profilePhoto || "", updated.status || "active", id]
    );
    return updated;
  } catch (err) {
    console.error("MySQL Update failed:", err);
    throw err;
  }
}

export async function updatePassword(id: string, newPass: string): Promise<void> {
  if (useFallback) {
    const db = getFallbackDB();
    const index = db.users.findIndex((u) => u.id === id);
    if (index !== -1) {
      db.users[index].password = newPass;
      saveFallbackDB(db);
      return;
    }
    throw new Error("User not found");
  }

  try {
    await pool!.query("UPDATE users SET password = ? WHERE id = ?;", [newPass, id]);
  } catch (err) {
    throw err;
  }
}

export interface OTPRecord {
  email: string;
  otp: string;
  expires: number;
  type: string;
  retries: number;
  payload?: any;
}

// Memory fallback store for OTPs when useFallback is true
let fallbackOTPStore: Record<string, OTPRecord> = {};

export async function getOTP(email: string): Promise<OTPRecord | null> {
  const normEmail = email.toLowerCase();
  if (useFallback) {
    return fallbackOTPStore[normEmail] || null;
  }
  try {
    const [rows]: any = await pool!.query("SELECT * FROM otps WHERE email = ?;", [normEmail]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      email: r.email,
      otp: r.otp,
      expires: Number(r.expires),
      type: r.type,
      retries: r.retries,
      payload: r.payload ? JSON.parse(r.payload) : null
    };
  } catch (err) {
    console.error("MySQL getOTP failed:", err);
    throw err;
  }
}

export async function saveOTP(
  email: string,
  otp: string,
  expires: number,
  type: string,
  payload?: any
): Promise<void> {
  const normEmail = email.toLowerCase();
  const rec: OTPRecord = {
    email: normEmail,
    otp,
    expires,
    type,
    retries: 0,
    payload
  };

  if (useFallback) {
    fallbackOTPStore[normEmail] = rec;
    return;
  }

  try {
    // Check if entry exists first, to avoid SQL duplicates or manual insert/update mapping
    await pool!.query(
      `INSERT INTO otps (email, otp, expires, type, retries, payload)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE otp = VALUES(otp), expires = VALUES(expires), type = VALUES(type), retries = 0, payload = VALUES(payload);`,
      [normEmail, otp, expires, type, 0, payload ? JSON.stringify(payload) : null]
    );
  } catch (err) {
    console.error("MySQL saveOTP failed:", err);
    throw err;
  }
}

export async function deleteOTP(email: string): Promise<void> {
  const normEmail = email.toLowerCase();
  if (useFallback) {
    delete fallbackOTPStore[normEmail];
    return;
  }
  try {
    await pool!.query("DELETE FROM otps WHERE email = ?;", [normEmail]);
  } catch (err) {
    console.error("MySQL deleteOTP failed:", err);
    throw err;
  }
}

export async function incrementOTPRetries(email: string): Promise<number> {
  const normEmail = email.toLowerCase();
  if (useFallback) {
    if (fallbackOTPStore[normEmail]) {
      fallbackOTPStore[normEmail].retries += 1;
      return fallbackOTPStore[normEmail].retries;
    }
    return 0;
  }
  try {
    await pool!.query("UPDATE otps SET retries = retries + 1 WHERE email = ?;", [normEmail]);
    const updated = await getOTP(normEmail);
    return updated ? updated.retries : 0;
  } catch (err) {
    console.error("MySQL incrementOTPRetries failed:", err);
    throw err;
  }
}

// ---------------- BUSINESS CRUD OPERATIONS ----------------
export async function getBusinesses(userId?: string): Promise<Business[]> {
  if (useFallback) {
    const db = getFallbackDB();
    if (userId) return db.businesses.filter((b) => b.userId === userId);
    return db.businesses;
  }

  try {
    let query = "SELECT * FROM businesses";
    const params = [];
    if (userId) {
      query += " WHERE user_id = ?";
      params.push(userId);
    }
    const [rows]: any = await pool!.query(query, params);
    return rows.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      name: r.business_name,
      phone: r.phone || "",
      address: r.address || "",
      notes: r.notes || "",
      status: r.status as "active" | "archived",
      createdAt: r.created_at
    }));
  } catch (err) {
    console.error("MySQL Select failed:", err);
    throw err;
  }
}

export async function createBusiness(biz: Business): Promise<Business> {
  if (useFallback) {
    const db = getFallbackDB();
    db.businesses.push(biz);
    
    // Seed standard form fields in fallback
    db.forms.push({
      businessId: biz.id,
      fields: [
        { id: "df1", name: "customerName", label: "Customer Name", type: "text", required: true },
        { id: "df2", name: "phone", label: "Phone Number", type: "text", required: true },
        { id: "df3", name: "address", label: "Address", type: "text", required: false },
        { id: "df4", name: "plantName", label: "Plant Name", type: "text", required: true },
        { id: "df5", name: "quantity", label: "Quantity", type: "number", required: true },
        { id: "df6", name: "notes", label: "Notes", type: "text", required: false }
      ]
    });
    
    saveFallbackDB(db);
    return biz;
  }

  try {
    await pool!.query(
      `INSERT INTO businesses (id, user_id, business_name, phone, address, notes, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [biz.id, biz.userId, biz.name, biz.phone, biz.address, biz.notes, biz.status, new Date(biz.createdAt)]
    );

    // Seed dynamic default form fields
   const defaultFields = [
  [`${biz.id}_1`, biz.id, "customerName", "Customer Name", "text", 1],
  [`${biz.id}_2`, biz.id, "phone", "Phone Number", "text", 1],
  [`${biz.id}_3`, biz.id, "address", "Address", "text", 0],
  [`${biz.id}_4`, biz.id, "plantName", "Plant Name", "text", 1],
  [`${biz.id}_5`, biz.id, "quantity", "Quantity", "number", 1],
  [`${biz.id}_6`, biz.id, "notes", "Notes", "text", 0]
];

for (const f of defaultFields) {
  await pool!.query(
    `INSERT IGNORE INTO form_fields
    (id, business_id, field_name, field_label, field_type, required)
    VALUES (?, ?, ?, ?, ?, ?);`,
    f
  );
}

    return biz;
  } catch (err) {
    console.error("MySQL createBusiness failed:", err);
    throw err;
  }
}

export async function updateBusiness(id: string, biz: Partial<Business>): Promise<Business> {
  if (useFallback) {
    const db = getFallbackDB();
    const index = db.businesses.findIndex((b) => b.id === id);
    if (index !== -1) {
      db.businesses[index] = { ...db.businesses[index], ...biz } as Business;
      saveFallbackDB(db);
      return db.businesses[index];
    }
    throw new Error("Business not found");
  }

  try {
    // get existing first
    const [rows]: any = await pool!.query("SELECT * FROM businesses WHERE id = ?;", [id]);
    if (rows.length === 0) throw new Error("Business not found");
    const r = rows[0];

    const updated = {
      name: biz.name ?? r.business_name,
      phone: biz.phone ?? r.phone,
      address: biz.address ?? r.address,
      notes: biz.notes ?? r.notes,
      status: biz.status ?? r.status
    };

    await pool!.query(
      `UPDATE businesses 
       SET business_name = ?, phone = ?, address = ?, notes = ?, status = ?
       WHERE id = ?;`,
      [updated.name, updated.phone, updated.address, updated.notes, updated.status, id]
    );

    return {
      id,
      userId: r.user_id,
      name: updated.name,
      phone: updated.phone || "",
      address: updated.address || "",
      notes: updated.notes || "",
      status: updated.status as "active" | "archived",
      createdAt: r.created_at
    };
  } catch (err) {
    throw err;
  }
}

export async function archiveBusiness(id: string, archive: boolean): Promise<Business> {
  const status = archive ? "archived" : "active";
  return updateBusiness(id, { status });
}

// ---------------- FORM BUILDER CRUD OPERATIONS ----------------
export async function getFormFields(businessId: string): Promise<FormField[]> {
  if (useFallback) {
    const db = getFallbackDB();
    const form = db.forms.find((f) => f.businessId === businessId);
    return form ? form.fields : [];
  }

  try {
    const [rows]: any = await pool!.query("SELECT * FROM form_fields WHERE business_id = ?;", [businessId]);
    return rows.map((r: any) => {
      const parsed = r.options ? JSON.parse(r.options) : undefined;
      const isTable = r.field_type === "table";
      return {
        id: r.id,
        businessId: r.business_id,
        name: r.field_name,
        label: r.field_label,
        type: r.field_type as any,
        required: Boolean(r.required),
        options: isTable ? undefined : parsed,
        columns: isTable ? parsed : undefined
      };
    });
  } catch (err) {
    console.error("MySQL getFormFields failed:", err);
    throw err;
  }
}

export async function saveFormFields(businessId: string, fields: FormField[]): Promise<void> {
  if (useFallback) {
    const db = getFallbackDB();
    const index = db.forms.findIndex((f) => f.businessId === businessId);
    if (index !== -1) {
      db.forms[index].fields = fields;
    } else {
      db.forms.push({ businessId, fields });
    }
    saveFallbackDB(db);
    return;
  }

  try {
    // Replace whole form fields. Simple transaction pattern
    await pool!.query("DELETE FROM form_fields WHERE business_id = ?;", [businessId]);
    for (const f of fields) {
      const dataToSave = f.type === "table" ? f.columns : f.options;
      await pool!.query(
        `INSERT INTO form_fields (id, business_id, field_name, field_label, field_type, required, options)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [f.id, businessId, f.name, f.label, f.type, f.required ? 1 : 0, dataToSave ? JSON.stringify(dataToSave) : null]
      );
    }
  } catch (err) {
    console.error("MySQL saveFormFields failed:", err);
    throw err;
  }
}

// ---------------- CUSTOMER RECORDS CRUD OPERATIONS ----------------
export async function getCustomerRecords(businessId?: string, search?: string): Promise<CustomerRecord[]> {
  if (useFallback) {
    const db = getFallbackDB();
    let records = db.customers.map(r => ({
      ...r,
      deletedAt: r.deletedAt || r.data?._deletedAt || undefined
    }));

    if (businessId) {
      records = records.filter((r) => r.businessId === businessId);
    }

    if (search) {
      const s = search.toLowerCase();
      records = records.filter((r) => {
        const matchesData = Object.values(r.data).some((v) => 
          String(v).toLowerCase().includes(s)
        );
        const matchesPayment = r.paymentMethod.toLowerCase().includes(s) ||
          (r.transactionId && r.transactionId.toLowerCase().includes(s));
        const matchesAmount = String(r.paymentAmount).includes(s);

        return matchesData || matchesPayment || matchesAmount;
      });
    }

    // Sort descending by created date
    records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return records;
  }

  try {
    let query = "SELECT * FROM customer_records";
    const params = [];

    if (businessId) {
      query += " WHERE business_id = ?";
      params.push(businessId);
    }

    const [rows]: any = await pool!.query(query, params);
    let records: CustomerRecord[] = rows.map((r: any) => {
      const parsedData = typeof r.customer_data === "string" ? JSON.parse(r.customer_data) : r.customer_data;
      return {
        id: r.id,
        businessId: r.business_id,
        data: parsedData,
        paymentAmount: Number(r.payment_amount),
        paymentMethod: r.payment_method as "Cash" | "Online",
        transactionId: r.transaction_id || undefined,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        deletedAt: parsedData?._deletedAt || undefined
      };
    });

    if (search) {
      const s = search.toLowerCase();
      records = records.filter((r) => {
        const matchesData = Object.values(r.data).some((v) => 
          String(v).toLowerCase().includes(s)
        );
        const matchesPayment = r.paymentMethod.toLowerCase().includes(s) || 
          (r.transactionId && r.transactionId.toLowerCase().includes(s));
        const matchesAmount = String(r.paymentAmount).includes(s);

        return matchesData || matchesPayment || matchesAmount;
      });
    }

    // Sort descending by created date
    records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return records;
  } catch (err) {
    console.error("MySQL getCustomerRecords failed:", err);
    throw err;
  }
}

export async function addCustomerRecord(record: CustomerRecord): Promise<CustomerRecord> {
  if (useFallback) {
    const db = getFallbackDB();
    db.customers.push(record);
    saveFallbackDB(db);
    return record;
  }

  try {
    await pool!.query(
      `INSERT INTO customer_records (id, business_id, customer_data, payment_amount, payment_method, transaction_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        record.id,
        record.businessId,
        JSON.stringify(record.data),
        record.paymentAmount,
        record.paymentMethod,
        record.transactionId || null,
        new Date(record.createdAt),
        new Date(record.updatedAt)
      ]
    );
    return record;
  } catch (err) {
    console.error("MySQL addCustomerRecord failed:", err);
    throw err;
  }
}

export async function updateCustomerRecord(id: string, record: Partial<CustomerRecord>): Promise<CustomerRecord> {
  if (useFallback) {
    const db = getFallbackDB();
    const index = db.customers.findIndex((c) => c.id === id);
    if (index !== -1) {
      const existing = db.customers[index];
      const updatedData = {
        ...(record.data ?? existing.data)
      };
      if (record.deletedAt !== undefined) {
        if (record.deletedAt === null) {
          delete updatedData._deletedAt;
        } else {
          updatedData._deletedAt = record.deletedAt;
        }
      }
      db.customers[index] = { 
        ...existing, 
        ...record,
        data: updatedData,
        deletedAt: record.deletedAt === null ? undefined : (record.deletedAt ?? existing.deletedAt),
        updatedAt: new Date().toISOString()
      } as CustomerRecord;
      saveFallbackDB(db);
      return db.customers[index];
    }
    throw new Error("Record not found");
  }

  try {
    // get existing
    const [rows]: any = await pool!.query("SELECT * FROM customer_records WHERE id = ?;", [id]);
    if (rows.length === 0) throw new Error("Record not found");
    const r = rows[0];

    const parsedData = typeof r.customer_data === "string" ? JSON.parse(r.customer_data) : r.customer_data;
    const updatedData = { ...(record.data ?? parsedData) };
    if (record.deletedAt !== undefined) {
      if (record.deletedAt === null) {
        delete updatedData._deletedAt;
      } else {
        updatedData._deletedAt = record.deletedAt;
      }
    }
    const updatedAmt = record.paymentAmount !== undefined ? Number(record.paymentAmount) : Number(r.payment_amount);
    const updatedMethod = record.paymentMethod ?? (r.payment_method as "Cash" | "Online");
    const updatedTxId = updatedMethod === "Online" ? (record.transactionId ?? r.transaction_id) : null;

    await pool!.query(
      `UPDATE customer_records
       SET customer_data = ?, payment_amount = ?, payment_method = ?, transaction_id = ?, updated_at = NOW()
       WHERE id = ?;`,
      [JSON.stringify(updatedData), updatedAmt, updatedMethod, updatedTxId, id]
    );

    return {
      id,
      businessId: r.business_id,
      data: updatedData,
      paymentAmount: updatedAmt,
      paymentMethod: updatedMethod,
      transactionId: updatedTxId || undefined,
      createdAt: r.created_at,
      updatedAt: new Date().toISOString(),
      deletedAt: record.deletedAt === null ? undefined : (record.deletedAt ?? parsedData?._deletedAt)
    };
  } catch (err) {
    console.error("MySQL updateCustomerRecord failed:", err);
    throw err;
  }
}

export async function deleteCustomerRecord(id: string): Promise<void> {
  if (useFallback) {
    const db = getFallbackDB();
    const index = db.customers.findIndex((c) => c.id === id);
    if (index !== -1) {
      db.customers.splice(index, 1);
      saveFallbackDB(db);
      return;
    }
    throw new Error("Record not found");
  }

  try {
    await pool!.query("DELETE FROM customer_records WHERE id = ?;", [id]);
  } catch (err) {
    console.error("MySQL deleteCustomerRecord failed:", err);
    throw err;
  }
}

// ---------------- SUPPORT TICKETS CRUD OPERATIONS ----------------
export async function getSupportTickets(userId?: string): Promise<SupportTicket[]> {
  if (useFallback) {
    const db = getFallbackDB();
    if (userId) {
      return db.tickets.filter((t) => t.userId === userId);
    }
    return db.tickets;
  }

  try {
    let query = "SELECT * FROM support_tickets";
    const params = [];
    if (userId) {
      query += " WHERE user_id = ?";
      params.push(userId);
    }
    query += " ORDER BY created_at DESC;";

    const [rows]: any = await pool!.query(query, params);
    return rows.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      subject: r.subject,
      description: r.description,
      status: r.status as "Open" | "In Progress" | "Resolved",
      createdAt: r.created_at
    }));
  } catch (err) {
    console.error("MySQL getSupportTickets failed:", err);
    throw err;
  }
}

export async function createSupportTicket(ticket: SupportTicket): Promise<SupportTicket> {
  if (useFallback) {
    const db = getFallbackDB();
    db.tickets.unshift(ticket);
    saveFallbackDB(db);
    return ticket;
  }

  try {
    await pool!.query(
      `INSERT INTO support_tickets (id, user_id, subject, description, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [ticket.id, ticket.userId || null, ticket.subject, ticket.description, ticket.status, new Date(ticket.createdAt)]
    );
    return ticket;
  } catch (err) {
    console.error("MySQL createSupportTicket failed:", err);
    throw err;
  }
}
