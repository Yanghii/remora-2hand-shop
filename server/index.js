import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { PRODUCTS as SEED_PRODUCTS } from '../src/data/products.js';
import {
  DEFAULT_STORE_CONFIG,
  DEMO_ACCOUNTS,
  INITIAL_ORDERS,
} from '../src/data/storeConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const DB_PATH = path.join(DATA_DIR, 'shop.db');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || '127.0.0.1';
const TOKEN_SECRET = process.env.AUTH_SECRET || 'remora-2hand-local-secret-change-in-prod';

// ===================== SQLITE DATABASE INIT =====================
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA busy_timeout = 5000;');

db.exec(`
  CREATE TABLE IF NOT EXISTS store_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'customer')),
    phone TEXT DEFAULT '',
    auth_provider TEXT DEFAULT 'email',
    provider_id TEXT,
    avatar_url TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    sku TEXT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    category_label TEXT,
    sub_category TEXT,
    style TEXT,
    origin_brand TEXT,
    condition_score INTEGER DEFAULT 95,
    condition_label TEXT,
    condition_note TEXT,
    price INTEGER NOT NULL,
    original_price INTEGER,
    is_new INTEGER DEFAULT 1,
    is_published INTEGER DEFAULT 1,
    is_sold_out INTEGER DEFAULT 0,
    sold_at TEXT,
    sold_to_order_id TEXT,
    size_guide_type TEXT,
    size TEXT NOT NULL,
    fit_suggestion TEXT,
    measurements TEXT DEFAULT '{}',
    color_key TEXT,
    color_name TEXT,
    color_hex TEXT,
    image TEXT NOT NULL,
    material TEXT,
    care_instructions TEXT DEFAULT '[]',
    description TEXT,
    highlights TEXT DEFAULT '[]',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customer_email TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT DEFAULT '',
    shipping_address TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    total INTEGER NOT NULL,
    items TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

// ===================== SECURITY HELPERS =====================
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
  const [salt, key] = String(storedHash || '').split(':');
  if (!salt || !key) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

function signToken(payload) {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(body).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (parsed.exp && Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function getAuthUser(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  const payload = verifyToken(token);
  if (!payload?.id) return null;
  const row = db
    .prepare('SELECT id, name, email, role, phone FROM users WHERE id = ?')
    .get(payload.id);
  return row || null;
}

// ===================== SEED INITIAL DATA =====================
function seedIfEmpty() {
  const nowIso = new Date().toISOString();

  const cfgRow = db.prepare('SELECT id FROM store_config WHERE id = 1').get();
  if (!cfgRow) {
    db.prepare('INSERT INTO store_config (id, data, updated_at) VALUES (1, ?, ?)').run(
      JSON.stringify(DEFAULT_STORE_CONFIG),
      nowIso
    );
  }

  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount === 0) {
    const insertUser = db.prepare(
      'INSERT INTO users (id, name, email, password_hash, role, phone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    for (const acc of DEMO_ACCOUNTS) {
      insertUser.run(
        acc.id,
        acc.name,
        acc.email.toLowerCase(),
        hashPassword(acc.password),
        acc.role,
        acc.phone || '',
        nowIso
      );
    }
  }

  const prodCount = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  if (prodCount === 0) {
    const insertProd = db.prepare(`
      INSERT INTO products (
        id, sku, name, category, category_label, sub_category, style, origin_brand,
        condition_score, condition_label, condition_note, price, original_price,
        is_new, is_published, is_sold_out, sold_at, sold_to_order_id, size_guide_type,
        size, fit_suggestion, measurements, color_key, color_name, color_hex, image,
        material, care_instructions, description, highlights, created_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `);

    SEED_PRODUCTS.forEach((p, idx) => {
      const ts = new Date(Date.now() - idx * 60000).toISOString();
      insertProd.run(
        p.id,
        p.sku || '',
        p.name,
        p.category,
        p.categoryLabel || '',
        p.subCategory || '',
        p.style || '',
        p.originBrand || '',
        p.conditionScore ?? 95,
        p.conditionLabel || '',
        p.conditionNote || '',
        p.price,
        p.originalPrice ?? null,
        p.isNew ? 1 : 0,
        p.isPublished === false ? 0 : 1,
        p.isSoldOut ? 1 : 0,
        p.soldAt || null,
        p.soldToOrderId || null,
        p.sizeGuideType || 'men-top',
        p.size || 'M',
        p.fitSuggestion || '',
        JSON.stringify(p.measurements || {}),
        p.colorKey || 'be',
        p.colorName || '',
        p.colorHex || '#D4C3AA',
        p.image,
        p.material || '',
        JSON.stringify(p.careInstructions || []),
        p.description || '',
        JSON.stringify(p.highlights || []),
        ts
      );
    });
  }

  const orderCount = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
  if (orderCount === 0) {
    const insertOrder = db.prepare(
      'INSERT INTO orders (id, customer_email, customer_name, customer_phone, shipping_address, status, total, items, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const o of INITIAL_ORDERS) {
      insertOrder.run(
        o.id,
        o.customerEmail || '',
        o.customerName,
        o.customerPhone || '',
        o.shippingAddress || '',
        o.status || 'pending',
        o.total,
        JSON.stringify(o.items || []),
        o.createdAt
      );
    }
  }
}

seedIfEmpty();

// Safe column upgrade for existing local SQLite DB
for (const sql of [
  "ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'email'",
  'ALTER TABLE users ADD COLUMN provider_id TEXT',
  "ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT ''",
]) {
  try {
    db.exec(sql);
  } catch {}
}

// ===================== ROW MAPPERS =====================
function mapProductRow(row) {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category,
    categoryLabel: row.category_label,
    subCategory: row.sub_category,
    style: row.style,
    originBrand: row.origin_brand,
    conditionScore: row.condition_score,
    conditionLabel: row.condition_label,
    conditionNote: row.condition_note,
    price: row.price,
    originalPrice: row.original_price,
    isNew: Boolean(row.is_new),
    isPublished: Boolean(row.is_published),
    isSoldOut: Boolean(row.is_sold_out),
    soldAt: row.sold_at,
    soldToOrderId: row.sold_to_order_id,
    sizeGuideType: row.size_guide_type,
    size: row.size,
    fitSuggestion: row.fit_suggestion,
    measurements: JSON.parse(row.measurements || '{}'),
    colorKey: row.color_key,
    colorName: row.color_name,
    colorHex: row.color_hex,
    image: row.image,
    material: row.material,
    careInstructions: JSON.parse(row.care_instructions || '[]'),
    description: row.description,
    highlights: JSON.parse(row.highlights || '[]'),
    createdAt: row.created_at,
  };
}

function mapOrderRow(row) {
  return {
    id: row.id,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    shippingAddress: row.shipping_address,
    status: row.status,
    total: row.total,
    items: JSON.parse(row.items || '[]'),
    createdAt: row.created_at,
  };
}

// ===================== REALTIME SSE BROADCAST =====================
const sseClients = new Set();

function broadcastEvent(event) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch {
      sseClients.delete(res);
    }
  }
}

// ===================== HTTP UTILITIES =====================
function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function readJsonBody(req, maxBytes = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('PAYLOAD_TOO_LARGE'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('INVALID_JSON'));
      }
    });
    req.on('error', reject);
  });
}

function formatViDateTime() {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(
    2,
    '0'
  )}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function serveStaticFile(res, filePath) {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return false;
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000',
  });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

// ===================== MAIN HTTP SERVER =====================
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const method = req.method || 'GET';

  try {
    // 1. Health check
    if (method === 'GET' && pathname === '/api/health') {
      return sendJson(res, 200, { ok: true, mode: 'local-sqlite', dbPath: DB_PATH });
    }

    // 2. Realtime Server-Sent Events stream
    if (method === 'GET' && pathname === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
      sseClients.add(res);
      req.on('close', () => sseClients.delete(res));
      return;
    }

    // 3. Store Config (GET public, PUT admin-only)
    if (pathname === '/api/config') {
      if (method === 'GET') {
        const row = db.prepare('SELECT data FROM store_config WHERE id = 1').get();
        return sendJson(res, 200, row ? JSON.parse(row.data) : DEFAULT_STORE_CONFIG);
      }
      if (method === 'PUT') {
        const user = getAuthUser(req);
        if (!user || user.role !== 'admin') {
          return sendJson(res, 403, { error: 'Chỉ Quản trị viên (Admin) mới được sửa cài đặt cửa hàng.' });
        }
        const body = await readJsonBody(req);
        const merged = { ...DEFAULT_STORE_CONFIG, ...body };
        db.prepare('UPDATE store_config SET data = ?, updated_at = ? WHERE id = 1').run(
          JSON.stringify(merged),
          new Date().toISOString()
        );
        broadcastEvent({ type: 'config_updated', config: merged });
        return sendJson(res, 200, merged);
      }
    }

    // 4. Auth endpoints
    if (method === 'GET' && pathname === '/api/auth/providers') {
      return sendJson(res, 200, {
        google: false,
        zalo: false,
        callbacks: {
          google: `${url.origin}/api/auth/oauth/google/callback`,
          zalo: `${url.origin}/api/auth/oauth/zalo/callback`,
        },
      });
    }

    if (method === 'POST' && pathname === '/api/auth/social-quick') {
      const { provider, email = '', phone = '', name = '' } = await readJsonBody(req);
      if (provider !== 'google' && provider !== 'zalo') {
        return sendJson(res, 400, { error: 'Nhà cung cấp không hợp lệ.' });
      }
      let cleanEmail = '';
      let cleanPhone = '';
      let displayName = '';
      let providerId = '';

      if (provider === 'google') {
        cleanEmail = String(email).trim().toLowerCase();
        if (!/^[^\s@]+@gmail\.com$/i.test(cleanEmail)) {
          return sendJson(res, 400, {
            error: 'Vui lòng nhập địa chỉ Gmail hợp lệ (kết thúc bằng @gmail.com).',
          });
        }
        providerId = cleanEmail;
        displayName = String(name).trim() || cleanEmail.split('@')[0];
      } else {
        const rawPhone = String(phone).replace(/\s+/g, '');
        if (!/^(0|\+84)\d{8,10}$/.test(rawPhone)) {
          return sendJson(res, 400, {
            error: 'Vui lòng nhập số điện thoại Zalo hợp lệ (VD: 0912345678).',
          });
        }
        cleanPhone = rawPhone.replace(/^\+84/, '0');
        providerId = cleanPhone;
        cleanEmail = `zalo_${cleanPhone}@zalo.remora.vn`;
        displayName = String(name).trim() || `Khách Zalo ${cleanPhone.slice(-4)}`;
      }

      const existing = db
        .prepare('SELECT * FROM users WHERE LOWER(email) = ? OR (auth_provider = ? AND provider_id = ?)')
        .get(cleanEmail, provider, providerId);

      if (existing) {
        if (existing.role === 'admin') {
          return sendJson(res, 403, {
            error: 'Tài khoản Quản trị viên vui lòng đăng nhập bằng mật khẩu Admin.',
          });
        }
        db.prepare('UPDATE users SET name = ?, phone = ?, auth_provider = ?, provider_id = ? WHERE id = ?').run(
          displayName || existing.name,
          cleanPhone || existing.phone || '',
          provider,
          providerId,
          existing.id
        );
        const user = {
          id: existing.id,
          name: displayName || existing.name,
          email: existing.email,
          role: existing.role,
          phone: cleanPhone || existing.phone || '',
          authProvider: provider,
          avatarUrl: existing.avatar_url || '',
        };
        return sendJson(res, 200, { user, token: signToken({ id: user.id, role: user.role }) });
      }

      const user = {
        id: `${provider}-${Date.now()}`,
        name: displayName,
        email: cleanEmail,
        role: 'customer',
        phone: cleanPhone,
        authProvider: provider,
        avatarUrl: '',
      };
      db.prepare(
        'INSERT INTO users (id, name, email, password_hash, role, phone, auth_provider, provider_id, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        user.id,
        user.name,
        user.email,
        hashPassword(crypto.randomBytes(16).toString('hex')),
        'customer',
        user.phone,
        provider,
        providerId,
        '',
        new Date().toISOString()
      );
      return sendJson(res, 201, { user, token: signToken({ id: user.id, role: user.role }) });
    }

    if (method === 'GET' && pathname === '/api/auth/me') {
      const user = getAuthUser(req);
      return sendJson(res, 200, { user });
    }

    if (method === 'POST' && pathname === '/api/auth/change-password') {
      const user = getAuthUser(req);
      if (!user) return sendJson(res, 401, { error: 'Vui lòng đăng nhập lại.' });
      const { currentPassword = '', newPassword = '' } = await readJsonBody(req);
      if (String(newPassword).length < 6) {
        return sendJson(res, 400, { error: 'Mật khẩu mới cần tối thiểu 6 ký tự.' });
      }
      const row = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
      if (!row || !verifyPassword(currentPassword, row.password_hash)) {
        return sendJson(res, 401, { error: 'Mật khẩu hiện tại không đúng.' });
      }
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
        hashPassword(newPassword),
        user.id
      );
      return sendJson(res, 200, { ok: true });
    }

    if (method === 'POST' && pathname === '/api/auth/login') {
      const { email = '', password = '' } = await readJsonBody(req);
      const row = db
        .prepare('SELECT * FROM users WHERE email = ?')
        .get(email.trim().toLowerCase());
      if (!row || !verifyPassword(password, row.password_hash)) {
        return sendJson(res, 401, { error: 'Email hoặc mật khẩu không chính xác.' });
      }
      const user = {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        phone: row.phone || '',
      };
      const token = signToken({ id: user.id, role: user.role });
      return sendJson(res, 200, { user, token });
    }

    if (method === 'POST' && pathname === '/api/auth/register') {
      const { name = '', email = '', password = '' } = await readJsonBody(req);
      const cleanEmail = email.trim().toLowerCase();
      if (!name.trim() || !cleanEmail || password.length < 4) {
        return sendJson(res, 400, { error: 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu (>= 4 ký tự).' });
      }
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
      if (existing) {
        return sendJson(res, 409, { error: 'Email này đã được đăng ký trước đó.' });
      }
      const user = {
        id: `user-${Date.now()}`,
        name: name.trim(),
        email: cleanEmail,
        role: 'customer',
        phone: '',
      };
      db.prepare(
        'INSERT INTO users (id, name, email, password_hash, role, phone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(user.id, user.name, user.email, hashPassword(password), 'customer', '', new Date().toISOString());
      const token = signToken({ id: user.id, role: user.role });
      return sendJson(res, 201, { user, token });
    }

    // 5. Image Upload endpoint (Admin only -> saves real image file to server/uploads/)
    if (method === 'POST' && pathname === '/api/upload') {
      const user = getAuthUser(req);
      if (!user || user.role !== 'admin') {
        return sendJson(res, 403, { error: 'Chỉ Quản trị viên mới được tải ảnh sản phẩm lên.' });
      }
      const { dataUrl = '' } = await readJsonBody(req, 10 * 1024 * 1024);
      const match = String(dataUrl).match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i);
      if (!match) {
        return sendJson(res, 400, { error: 'Định dạng ảnh không hợp lệ (hỗ trợ JPG, PNG, WebP).' });
      }
      const ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
      const buffer = Buffer.from(match[2], 'base64');
      const fileName = `item-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, fileName), buffer);
      return sendJson(res, 201, { url: `/uploads/${fileName}` });
    }

    // 6. Products CRUD (GET public/admin, POST/PATCH/DELETE admin-only)
    if (pathname === '/api/products') {
      if (method === 'GET') {
        const user = getAuthUser(req);
        const includeHidden = url.searchParams.get('all') === '1' && user?.role === 'admin';
        const rows = includeHidden
          ? db.prepare('SELECT * FROM products ORDER BY created_at DESC').all()
          : db
              .prepare('SELECT * FROM products WHERE is_published = 1 ORDER BY created_at DESC')
              .all();
        return sendJson(res, 200, rows.map(mapProductRow));
      }

      if (method === 'POST') {
        const user = getAuthUser(req);
        if (!user || user.role !== 'admin') {
          return sendJson(res, 403, { error: 'Chỉ Admin mới được đăng sản phẩm mới.' });
        }
        const p = await readJsonBody(req);
        const id = p.id || `2h-${Date.now()}`;
        const createdAt = new Date().toISOString();
        db.prepare(`
          INSERT INTO products (
            id, sku, name, category, category_label, sub_category, style, origin_brand,
            condition_score, condition_label, condition_note, price, original_price,
            is_new, is_published, is_sold_out, sold_at, sold_to_order_id, size_guide_type,
            size, fit_suggestion, measurements, color_key, color_name, color_hex, image,
            material, care_instructions, description, highlights, created_at
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?
          )
        `).run(
          id,
          p.sku || `2H-${Math.floor(100 + Math.random() * 900)}`,
          p.name,
          p.category || 'nam',
          p.categoryLabel || 'Nam',
          p.subCategory || 'Đồ 2Hand',
          p.style || 'Vintage',
          p.originBrand || 'Tuyển chọn 2Hand',
          p.conditionScore ?? 95,
          p.conditionLabel || '95% · Rất đẹp',
          p.conditionNote || '',
          Number(p.price) || 0,
          p.originalPrice ? Number(p.originalPrice) : null,
          p.isNew ? 1 : 0,
          1,
          0,
          null,
          null,
          p.sizeGuideType || 'men-top',
          p.size || 'M',
          p.fitSuggestion || '',
          JSON.stringify(p.measurements || {}),
          p.colorKey || 'be',
          p.colorName || 'Be / Kem',
          p.colorHex || '#D4C3AA',
          p.image || '/images/men-jacket.jpg',
          p.material || '',
          JSON.stringify(p.careInstructions || []),
          p.description || '',
          JSON.stringify(p.highlights || []),
          createdAt
        );
        const created = mapProductRow(db.prepare('SELECT * FROM products WHERE id = ?').get(id));
        broadcastEvent({ type: 'products_changed' });
        return sendJson(res, 201, created);
      }
    }

    const productMatch = pathname.match(/^\/api\/products\/([^/]+)$/);
    if (productMatch) {
      const prodId = decodeURIComponent(productMatch[1]);
      const user = getAuthUser(req);
      if (!user || user.role !== 'admin') {
        return sendJson(res, 403, { error: 'Chỉ Admin mới được chỉnh sửa hoặc xóa sản phẩm.' });
      }

      if (method === 'PATCH') {
        const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(prodId);
        if (!existing) return sendJson(res, 404, { error: 'Không tìm thấy sản phẩm.' });
        const patch = await readJsonBody(req);
        const current = mapProductRow(existing);
        const next = { ...current, ...patch };

        db.prepare(`
          UPDATE products SET
            name = ?, category = ?, category_label = ?, sub_category = ?, style = ?,
            origin_brand = ?, condition_score = ?, condition_label = ?, condition_note = ?,
            price = ?, original_price = ?, is_new = ?, is_published = ?, is_sold_out = ?,
            sold_at = ?, size_guide_type = ?, size = ?, fit_suggestion = ?, measurements = ?,
            color_key = ?, color_name = ?, color_hex = ?, image = ?, description = ?
          WHERE id = ?
        `).run(
          next.name,
          next.category,
          next.categoryLabel,
          next.subCategory,
          next.style,
          next.originBrand,
          next.conditionScore,
          next.conditionLabel,
          next.conditionNote,
          Number(next.price),
          next.originalPrice ? Number(next.originalPrice) : null,
          next.isNew ? 1 : 0,
          next.isPublished ? 1 : 0,
          next.isSoldOut ? 1 : 0,
          next.isSoldOut ? next.soldAt || formatViDateTime() : null,
          next.sizeGuideType,
          next.size,
          next.fitSuggestion,
          JSON.stringify(next.measurements || {}),
          next.colorKey,
          next.colorName,
          next.colorHex,
          next.image,
          next.description,
          prodId
        );
        const updated = mapProductRow(db.prepare('SELECT * FROM products WHERE id = ?').get(prodId));
        broadcastEvent({ type: 'products_changed' });
        return sendJson(res, 200, updated);
      }

      if (method === 'DELETE') {
        db.prepare('DELETE FROM products WHERE id = ?').run(prodId);
        broadcastEvent({ type: 'products_changed' });
        return sendJson(res, 200, { ok: true });
      }
    }

    // 7. Orders (GET: Admin sees all, Customer sees own; POST: Atomic 1-of-1 Sold Out checkout!)
    if (pathname === '/api/orders') {
      if (method === 'GET') {
        const user = getAuthUser(req);
        if (!user) return sendJson(res, 401, { error: 'Vui lòng đăng nhập để xem đơn hàng.' });
        const rows =
          user.role === 'admin'
            ? db.prepare('SELECT * FROM orders ORDER BY rowid DESC').all()
            : db
                .prepare('SELECT * FROM orders WHERE LOWER(customer_email) = ? ORDER BY rowid DESC')
                .all(user.email.toLowerCase());
        return sendJson(res, 200, rows.map(mapOrderRow));
      }

      if (method === 'POST') {
        const user = getAuthUser(req);
        const body = await readJsonBody(req);
        const items = Array.isArray(body.items) ? body.items : [];
        if (items.length === 0) {
          return sendJson(res, 400, { error: 'Giỏ hàng trống.' });
        }
        if (!body.customerName?.trim() || !body.customerPhone?.trim() || !body.shippingAddress?.trim()) {
          return sendJson(res, 400, { error: 'Vui lòng nhập đầy đủ họ tên, SĐT và địa chỉ nhận hàng.' });
        }

        const orderId = `2H-${Math.floor(100000 + Math.random() * 900000)}`;
        const createdAt = formatViDateTime();

        // ATOMIC TRANSACTION: prevents two customers from ever buying the same 1-of-1 piece!
        db.exec('BEGIN IMMEDIATE');
        try {
          const verifiedItems = [];
          let subtotal = 0;

          for (const reqItem of items) {
            const row = db
              .prepare('SELECT * FROM products WHERE id = ? AND is_published = 1')
              .get(reqItem.productId);
            if (!row) {
              db.exec('ROLLBACK');
              return sendJson(res, 404, { error: `Sản phẩm "${reqItem.name}" không còn tồn tại.` });
            }
            if (row.is_sold_out) {
              db.exec('ROLLBACK');
              return sendJson(res, 409, {
                error: `Rất tiếc, "${row.name}" vừa có người nhanh tay chốt trước (SOLD OUT)!`,
              });
            }
            subtotal += row.price;
            verifiedItems.push({
              productId: row.id,
              name: row.name,
              colorName: (row.color_name || '').split('(')[0].trim(),
              size: row.size,
              quantity: 1,
              price: row.price,
            });
          }

          const cfgRow = db.prepare('SELECT data FROM store_config WHERE id = 1').get();
          const cfg = cfgRow ? JSON.parse(cfgRow.data) : DEFAULT_STORE_CONFIG;
          const freeShip = cfg.freeShipThreshold ?? 499000;
          const shippingFee = subtotal >= freeShip ? 0 : 30000;
          const total = subtotal + shippingFee;

          const markSold = db.prepare(
            'UPDATE products SET is_sold_out = 1, sold_at = ?, sold_to_order_id = ? WHERE id = ?'
          );
          for (const vi of verifiedItems) {
            markSold.run(createdAt, orderId, vi.productId);
          }

          db.prepare(
            'INSERT INTO orders (id, customer_email, customer_name, customer_phone, shipping_address, status, total, items, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
          ).run(
            orderId,
            user?.email || body.customerEmail || 'khach.mua.le@shop.vn',
            body.customerName.trim(),
            body.customerPhone.trim(),
            body.shippingAddress.trim(),
            'pending',
            total,
            JSON.stringify(verifiedItems),
            createdAt
          );

          db.exec('COMMIT');

          const createdOrder = mapOrderRow(
            db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId)
          );
          broadcastEvent({
            type: 'order_created',
            orderId,
            soldProductIds: verifiedItems.map((i) => i.productId),
          });
          return sendJson(res, 201, { order: createdOrder });
        } catch (err) {
          try {
            db.exec('ROLLBACK');
          } catch {}
          throw err;
        }
      }
    }

    const orderStatusMatch = pathname.match(/^\/api\/orders\/([^/]+)$/);
    if (orderStatusMatch && method === 'PATCH') {
      const user = getAuthUser(req);
      if (!user || user.role !== 'admin') {
        return sendJson(res, 403, { error: 'Chỉ Admin mới được cập nhật trạng thái đơn hàng.' });
      }
      const orderId = decodeURIComponent(orderStatusMatch[1]);
      const { status } = await readJsonBody(req);
      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, orderId);
      const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
      if (!updated) return sendJson(res, 404, { error: 'Không tìm thấy đơn hàng.' });
      broadcastEvent({ type: 'orders_changed' });
      return sendJson(res, 200, mapOrderRow(updated));
    }

    const restockMatch = pathname.match(/^\/api\/orders\/([^/]+)\/restock$/);
    if (restockMatch && method === 'POST') {
      const user = getAuthUser(req);
      if (!user || user.role !== 'admin') {
        return sendJson(res, 403, { error: 'Chỉ Admin mới được mở bán lại sản phẩm.' });
      }
      const orderId = decodeURIComponent(restockMatch[1]);
      const orderRow = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
      if (!orderRow) return sendJson(res, 404, { error: 'Không tìm thấy đơn hàng.' });
      const items = JSON.parse(orderRow.items || '[]');
      const restockStmt = db.prepare(
        'UPDATE products SET is_sold_out = 0, sold_at = NULL, sold_to_order_id = NULL WHERE id = ?'
      );
      for (const item of items) {
        if (item.productId) restockStmt.run(item.productId);
      }
      broadcastEvent({ type: 'products_changed' });
      return sendJson(res, 200, { ok: true });
    }

    // 8. Serve uploaded second-hand photos (/uploads/*)
    if (method === 'GET' && pathname.startsWith('/uploads/')) {
      const safeName = path.basename(pathname);
      if (serveStaticFile(res, path.join(UPLOAD_DIR, safeName))) return;
      return sendJson(res, 404, { error: 'Not found' });
    }

    // 9. Production single-server mode: serve built frontend dist/
    if (method === 'GET' && fs.existsSync(DIST_DIR)) {
      const reqFile = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
      const fullPath = path.join(DIST_DIR, reqFile);
      if (fullPath.startsWith(DIST_DIR) && serveStaticFile(res, fullPath)) return;
      if (serveStaticFile(res, path.join(DIST_DIR, 'index.html'))) return;
    }

    sendJson(res, 404, { error: 'API route not found' });
  } catch (err) {
    console.error('[API Error]', err);
    if (err.message === 'PAYLOAD_TOO_LARGE') {
      return sendJson(res, 413, { error: 'Dung lượng ảnh hoặc dữ liệu vượt quá giới hạn.' });
    }
    sendJson(res, 500, { error: 'Lỗi máy chủ nội bộ.' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[2Hand Backend] Running at http://${HOST}:${PORT}`);
  console.log(`[2Hand Backend] SQLite DB: ${DB_PATH}`);
});
