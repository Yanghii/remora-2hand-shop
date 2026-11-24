import crypto from 'node:crypto';
import pg from 'pg';
import { put } from '@vercel/blob';
import { PRODUCTS as SEED_PRODUCTS } from '../src/data/products.js';
import {
  DEFAULT_STORE_CONFIG,
  DEMO_ACCOUNTS,
  INITIAL_ORDERS,
} from '../src/data/storeConfig.js';

const { Pool } = pg;

let pool = null;
let initPromise = null;

function getPool() {
  if (!pool) {
    const connStr =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.NEON_DATABASE_URL;
    if (!connStr) {
      throw new Error('Chưa cấu hình biến kết nối PostgreSQL (DATABASE_URL).');
    }
    pool = new Pool({
      connectionString: connStr,
      ssl: connStr.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

async function query(text, params = []) {
  return getPool().query(text, params);
}

function getTokenSecret() {
  return process.env.AUTH_SECRET || 'remora-2hand-vercel-signing-key-2026';
}

function getOAuthAvailability() {
  return {
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    zalo: Boolean(process.env.ZALO_APP_ID && process.env.ZALO_APP_SECRET),
  };
}

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

function signPayload(payload, ttlMs = 7 * 24 * 60 * 60 * 1000) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + ttlMs })).toString(
    'base64url'
  );
  const sig = crypto.createHmac('sha256', getTokenSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifySignedPayload(token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', getTokenSecret()).update(body).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (parsed.exp && Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function signToken(payload) {
  return signPayload(payload);
}

function formatViDateTime() {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const d = String(now.getUTCDate()).padStart(2, '0');
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const y = now.getUTCFullYear();
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const mm = String(now.getUTCMinutes()).padStart(2, '0');
  return `${d}/${m}/${y} ${hh}:${mm}`;
}

function mapUserRow(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    phone: row.phone || '',
    authProvider: row.auth_provider || 'email',
    avatarUrl: row.avatar_url || '',
  };
}

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
    price: Number(row.price),
    originalPrice: row.original_price ? Number(row.original_price) : null,
    isNew: Boolean(row.is_new),
    isPublished: Boolean(row.is_published),
    isSoldOut: Boolean(row.is_sold_out),
    soldAt: row.sold_at,
    soldToOrderId: row.sold_to_order_id,
    sizeGuideType: row.size_guide_type,
    size: row.size,
    fitSuggestion: row.fit_suggestion,
    measurements: row.measurements || {},
    colorKey: row.color_key,
    colorName: row.color_name,
    colorHex: row.color_hex,
    image: row.image,
    material: row.material,
    careInstructions: row.care_instructions || [],
    description: row.description,
    highlights: row.highlights || [],
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
    total: Number(row.total),
    items: row.items || [],
    createdAt: row.created_at,
  };
}

async function getAuthUser(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  const payload = verifySignedPayload(header.slice(7).trim());
  if (!payload?.id) return null;
  const res = await query(
    'SELECT id, name, email, role, phone, auth_provider, avatar_url FROM users WHERE id = $1 LIMIT 1',
    [payload.id]
  );
  return res.rows[0] ? mapUserRow(res.rows[0]) : null;
}

async function ensureInitialized() {
  if (!initPromise) {
    initPromise = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS store_config (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('admin', 'customer')),
          phone TEXT NOT NULL DEFAULT '',
          auth_provider TEXT NOT NULL DEFAULT 'email',
          provider_id TEXT,
          avatar_url TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          sku TEXT NOT NULL DEFAULT '',
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          category_label TEXT NOT NULL DEFAULT '',
          sub_category TEXT NOT NULL DEFAULT '',
          style TEXT NOT NULL DEFAULT '',
          origin_brand TEXT NOT NULL DEFAULT '',
          condition_score INTEGER NOT NULL DEFAULT 95,
          condition_label TEXT NOT NULL DEFAULT '',
          condition_note TEXT NOT NULL DEFAULT '',
          price INTEGER NOT NULL,
          original_price INTEGER,
          is_new BOOLEAN NOT NULL DEFAULT TRUE,
          is_published BOOLEAN NOT NULL DEFAULT TRUE,
          is_sold_out BOOLEAN NOT NULL DEFAULT FALSE,
          sold_at TEXT,
          sold_to_order_id TEXT,
          size_guide_type TEXT NOT NULL DEFAULT 'men-top',
          size TEXT NOT NULL,
          fit_suggestion TEXT NOT NULL DEFAULT '',
          measurements JSONB NOT NULL DEFAULT '{}'::jsonb,
          color_key TEXT NOT NULL DEFAULT 'be',
          color_name TEXT NOT NULL DEFAULT '',
          color_hex TEXT NOT NULL DEFAULT '#D4C3AA',
          image TEXT NOT NULL,
          material TEXT NOT NULL DEFAULT '',
          care_instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
          description TEXT NOT NULL DEFAULT '',
          highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          customer_email TEXT NOT NULL DEFAULT '',
          customer_name TEXT NOT NULL,
          customer_phone TEXT NOT NULL DEFAULT '',
          shipping_address TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'pending',
          total INTEGER NOT NULL,
          items JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_at TEXT NOT NULL,
          created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      const cfgRes = await query('SELECT id FROM store_config WHERE id = 1');
      if (cfgRes.rows.length === 0) {
        await query(
          'INSERT INTO store_config (id, data) VALUES (1, $1::jsonb) ON CONFLICT (id) DO NOTHING',
          [JSON.stringify(DEFAULT_STORE_CONFIG)]
        );
      }

      const userCount = (await query('SELECT COUNT(*)::int AS c FROM users')).rows[0]?.c ?? 0;
      if (userCount === 0) {
        for (const acc of DEMO_ACCOUNTS) {
          await query(
            `INSERT INTO users (id, name, email, password_hash, role, phone, auth_provider)
             VALUES ($1, $2, $3, $4, $5, $6, 'email') ON CONFLICT (email) DO NOTHING`,
            [acc.id, acc.name, acc.email.toLowerCase(), hashPassword(acc.password), acc.role, acc.phone || '']
          );
        }
      }

      const prodCount = (await query('SELECT COUNT(*)::int AS c FROM products')).rows[0]?.c ?? 0;
      if (prodCount === 0) {
        for (let idx = 0; idx < SEED_PRODUCTS.length; idx++) {
          const p = SEED_PRODUCTS[idx];
          const ts = new Date(Date.now() - idx * 60000).toISOString();
          await query(
            `INSERT INTO products (
              id, sku, name, category, category_label, sub_category, style, origin_brand,
              condition_score, condition_label, condition_note, price, original_price,
              is_new, is_published, is_sold_out, sold_at, sold_to_order_id, size_guide_type,
              size, fit_suggestion, measurements, color_key, color_name, color_hex, image,
              material, care_instructions, description, highlights, created_at
            ) VALUES (
              $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,
              $22::jsonb,$23,$24,$25,$26,$27,$28::jsonb,$29,$30::jsonb,$31
            ) ON CONFLICT (id) DO NOTHING`,
            [
              p.id, p.sku || '', p.name, p.category, p.categoryLabel || '', p.subCategory || '',
              p.style || '', p.originBrand || '', p.conditionScore ?? 95, p.conditionLabel || '',
              p.conditionNote || '', p.price, p.originalPrice ?? null, Boolean(p.isNew),
              p.isPublished !== false, Boolean(p.isSoldOut), p.soldAt || null,
              p.soldToOrderId || null, p.sizeGuideType || 'men-top', p.size || 'M',
              p.fitSuggestion || '', JSON.stringify(p.measurements || {}), p.colorKey || 'be',
              p.colorName || '', p.colorHex || '#D4C3AA', p.image, p.material || '',
              JSON.stringify(p.careInstructions || []), p.description || '',
              JSON.stringify(p.highlights || []), ts,
            ]
          );
        }
      }

      const ordCount = (await query('SELECT COUNT(*)::int AS c FROM orders')).rows[0]?.c ?? 0;
      if (ordCount === 0) {
        for (const o of INITIAL_ORDERS) {
          await query(
            `INSERT INTO orders (id, customer_email, customer_name, customer_phone, shipping_address, status, total, items, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9) ON CONFLICT (id) DO NOTHING`,
            [
              o.id, o.customerEmail || '', o.customerName, o.customerPhone || '',
              o.shippingAddress || '', o.status || 'pending', o.total,
              JSON.stringify(o.items || []), o.createdAt,
            ]
          );
        }
      }
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  await initPromise;
}

async function upsertSocialCustomer({ provider, providerId, name, email, phone = '', avatarUrl = '' }) {
  const cleanEmail = email.trim().toLowerCase();

  const byProv = await query(
    'SELECT * FROM users WHERE auth_provider = $1 AND provider_id = $2 LIMIT 1',
    [provider, providerId]
  );
  if (byProv.rows[0]) {
    if (byProv.rows[0].role === 'admin') {
      throw new Error('Tài khoản Quản trị viên vui lòng đăng nhập bằng mật khẩu Admin.');
    }
    const upd = await query(
      `UPDATE users SET name = $1, avatar_url = $2, phone = $3 WHERE id = $4 RETURNING *`,
      [name || byProv.rows[0].name, avatarUrl || byProv.rows[0].avatar_url, phone || byProv.rows[0].phone, byProv.rows[0].id]
    );
    return mapUserRow(upd.rows[0]);
  }

  const byEmail = await query('SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1', [cleanEmail]);
  if (byEmail.rows[0]) {
    if (byEmail.rows[0].role === 'admin') {
      throw new Error('Email này thuộc Quản trị viên — vui lòng đăng nhập tại /#admin.');
    }
    const upd = await query(
      `UPDATE users SET auth_provider = $1, provider_id = $2, name = $3, avatar_url = $4, phone = $5 WHERE id = $6 RETURNING *`,
      [provider, providerId, name || byEmail.rows[0].name, avatarUrl || byEmail.rows[0].avatar_url, phone || byEmail.rows[0].phone, byEmail.rows[0].id]
    );
    return mapUserRow(upd.rows[0]);
  }

  const newId = `${provider}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const ins = await query(
    `INSERT INTO users (id, name, email, password_hash, role, phone, auth_provider, provider_id, avatar_url)
     VALUES ($1,$2,$3,$4,'customer',$5,$6,$7,$8) RETURNING *`,
    [newId, name, cleanEmail, hashPassword(crypto.randomBytes(24).toString('hex')), phone, provider, providerId, avatarUrl]
  );
  return mapUserRow(ins.rows[0]);
}

function getOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  return `${proto}://${host}`;
}

export default async function handler(req, res) {
  const origin = getOrigin(req);
  const url = new URL(req.url, origin);
  const pathname = url.pathname;
  const method = req.method || 'GET';

  try {
    await ensureInitialized();

    // 1. Health
    if (method === 'GET' && pathname === '/api/health') {
      return res.status(200).json({
        ok: true,
        mode: 'vercel-neon-postgres',
        blobEnabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
        oauth: getOAuthAvailability(),
      });
    }

    // 2. OAuth Providers
    if (method === 'GET' && pathname === '/api/auth/providers') {
      return res.status(200).json({
        ...getOAuthAvailability(),
        callbacks: {
          google: `${origin}/api/auth/oauth/google/callback`,
          zalo: `${origin}/api/auth/oauth/zalo/callback`,
        },
      });
    }

    // 3. Official Google OAuth2
    if (method === 'GET' && pathname === '/api/auth/oauth/google/start') {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) {
        return res.redirect(302, `${origin}/#auth-error?msg=${encodeURIComponent('Google OAuth chưa cấu hình.')}`);
      }
      const state = signPayload({ provider: 'google', nonce: crypto.randomBytes(8).toString('hex') }, 600000);
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', `${origin}/api/auth/oauth/google/callback`);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'openid email profile');
      authUrl.searchParams.set('prompt', 'select_account');
      authUrl.searchParams.set('state', state);
      return res.redirect(302, authUrl.toString());
    }

    if (method === 'GET' && pathname === '/api/auth/oauth/google/callback') {
      const code = url.searchParams.get('code');
      const state = verifySignedPayload(url.searchParams.get('state') || '');
      if (!code || !state || state.provider !== 'google' || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.redirect(302, `${origin}/#auth-error?msg=${encodeURIComponent('Phiên đăng nhập Google không hợp lệ.')}`);
      }
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: `${origin}/api/auth/oauth/google/callback`,
          grant_type: 'authorization_code',
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        return res.redirect(302, `${origin}/#auth-error?msg=${encodeURIComponent('Không thể xác thực Google.')}`);
      }
      const profile = await (
        await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        })
      ).json();
      const user = await upsertSocialCustomer({
        provider: 'google',
        providerId: String(profile.sub || profile.email),
        name: profile.name || profile.email.split('@')[0],
        email: profile.email,
        avatarUrl: profile.picture || '',
      });
      return res.redirect(
        302,
        `${origin}/#auth-callback?token=${encodeURIComponent(signToken({ id: user.id, role: user.role }))}&provider=google`
      );
    }

    // 4. Official Zalo OAuth v4 (PKCE)
    if (method === 'GET' && pathname === '/api/auth/oauth/zalo/start') {
      const appId = process.env.ZALO_APP_ID;
      if (!appId) {
        return res.redirect(302, `${origin}/#auth-error?msg=${encodeURIComponent('Zalo OAuth chưa cấu hình.')}`);
      }
      const codeVerifier = crypto.randomBytes(32).toString('base64url');
      const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
      const state = signPayload({ provider: 'zalo', codeVerifier }, 600000);
      const zaloUrl = new URL('https://oauth.zaloapp.com/v4/permission');
      zaloUrl.searchParams.set('app_id', appId);
      zaloUrl.searchParams.set('redirect_uri', `${origin}/api/auth/oauth/zalo/callback`);
      zaloUrl.searchParams.set('code_challenge', codeChallenge);
      zaloUrl.searchParams.set('state', state);
      return res.redirect(302, zaloUrl.toString());
    }

    if (method === 'GET' && pathname === '/api/auth/oauth/zalo/callback') {
      const code = url.searchParams.get('code');
      const state = verifySignedPayload(url.searchParams.get('state') || '');
      if (!code || !state || state.provider !== 'zalo' || !process.env.ZALO_APP_ID || !process.env.ZALO_APP_SECRET) {
        return res.redirect(302, `${origin}/#auth-error?msg=${encodeURIComponent('Phiên đăng nhập Zalo không hợp lệ.')}`);
      }
      const tokenRes = await fetch('https://oauth.zaloapp.com/v4/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          secret_key: process.env.ZALO_APP_SECRET,
        },
        body: new URLSearchParams({
          code,
          app_id: process.env.ZALO_APP_ID,
          grant_type: 'authorization_code',
          code_verifier: String(state.codeVerifier),
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        return res.redirect(302, `${origin}/#auth-error?msg=${encodeURIComponent('Không lấy được token Zalo.')}`);
      }
      const profile = await (
        await fetch('https://graph.zalo.me/v2.0/me?fields=id,name,picture', {
          headers: { access_token: tokenData.access_token },
        })
      ).json();
      const user = await upsertSocialCustomer({
        provider: 'zalo',
        providerId: String(profile.id),
        name: profile.name || `Khách Zalo ${String(profile.id).slice(-4)}`,
        email: `zalo_${profile.id}@zalo.remora.vn`,
        avatarUrl: profile.picture?.data?.url || '',
      });
      return res.redirect(
        302,
        `${origin}/#auth-callback?token=${encodeURIComponent(signToken({ id: user.id, role: user.role }))}&provider=zalo`
      );
    }

    // 5. Fast Customer Gmail / Zalo Login
    if (method === 'POST' && pathname === '/api/auth/social-quick') {
      const { provider, email = '', phone = '', name = '' } = req.body || {};
      if (provider === 'google') {
        const cleanGmail = String(email).trim().toLowerCase();
        if (!/^[^\s@]+@gmail\.com$/i.test(cleanGmail)) {
          return res.status(400).json({ error: 'Vui lòng nhập địa chỉ Gmail hợp lệ (kết thúc bằng @gmail.com).' });
        }
        const user = await upsertSocialCustomer({
          provider: 'google',
          providerId: cleanGmail,
          name: String(name).trim() || cleanGmail.split('@')[0],
          email: cleanGmail,
        });
        return res.status(200).json({ user, token: signToken({ id: user.id, role: user.role }) });
      }
      if (provider === 'zalo') {
        const cleanPhone = String(phone).replace(/\s+/g, '');
        if (!/^(0|\+84)\d{8,10}$/.test(cleanPhone)) {
          return res.status(400).json({ error: 'Vui lòng nhập số điện thoại Zalo hợp lệ (VD: 0912345678).' });
        }
        const normalizedPhone = cleanPhone.replace(/^\+84/, '0');
        const user = await upsertSocialCustomer({
          provider: 'zalo',
          providerId: normalizedPhone,
          name: String(name).trim() || `Khách Zalo ${normalizedPhone.slice(-4)}`,
          email: `zalo_${normalizedPhone}@zalo.remora.vn`,
          phone: normalizedPhone,
        });
        return res.status(200).json({ user, token: signToken({ id: user.id, role: user.role }) });
      }
      return res.status(400).json({ error: 'Nhà cung cấp không hợp lệ.' });
    }

    // 6. Store Config
    if (pathname === '/api/config') {
      if (method === 'GET') {
        const r = await query('SELECT data FROM store_config WHERE id = 1');
        return res.status(200).json({ ...DEFAULT_STORE_CONFIG, ...(r.rows[0]?.data || {}) });
      }
      if (method === 'PUT') {
        const user = await getAuthUser(req);
        if (!user || user.role !== 'admin') {
          return res.status(403).json({ error: 'Chỉ Quản trị viên (Admin) mới được sửa cài đặt cửa hàng.' });
        }
        const merged = { ...DEFAULT_STORE_CONFIG, ...(req.body || {}) };
        await query(
          `INSERT INTO store_config (id, data, updated_at) VALUES (1, $1::jsonb, NOW())
           ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
          [JSON.stringify(merged)]
        );
        return res.status(200).json(merged);
      }
    }

    // 7. Standard Auth & Password Change
    if (method === 'GET' && pathname === '/api/auth/me') {
      return res.status(200).json({ user: await getAuthUser(req) });
    }

    if (method === 'POST' && pathname === '/api/auth/login') {
      const { email = '', password = '' } = req.body || {};
      const r = await query('SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1', [
        String(email).trim().toLowerCase(),
      ]);
      const row = r.rows[0];
      if (!row || !verifyPassword(password, row.password_hash)) {
        return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác.' });
      }
      const user = mapUserRow(row);
      return res.status(200).json({ user, token: signToken({ id: user.id, role: user.role }) });
    }

    if (method === 'POST' && pathname === '/api/auth/register') {
      const { name = '', email = '', password = '' } = req.body || {};
      const cleanEmail = String(email).trim().toLowerCase();
      if (!name.trim() || !cleanEmail || password.length < 4) {
        return res.status(400).json({ error: 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu (>= 4 ký tự).' });
      }
      const exists = await query('SELECT id FROM users WHERE LOWER(email) = $1', [cleanEmail]);
      if (exists.rows.length > 0) {
        return res.status(409).json({ error: 'Email này đã được đăng ký trước đó.' });
      }
      const ins = await query(
        `INSERT INTO users (id, name, email, password_hash, role, phone, auth_provider)
         VALUES ($1,$2,$3,$4,'customer','','email') RETURNING *`,
        [`user-${Date.now()}`, name.trim(), cleanEmail, hashPassword(password)]
      );
      const user = mapUserRow(ins.rows[0]);
      return res.status(201).json({ user, token: signToken({ id: user.id, role: user.role }) });
    }

    if (method === 'POST' && pathname === '/api/auth/change-password') {
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ error: 'Vui lòng đăng nhập lại.' });
      const { currentPassword = '', newPassword = '' } = req.body || {};
      if (String(newPassword).length < 6) {
        return res.status(400).json({ error: 'Mật khẩu mới cần tối thiểu 6 ký tự.' });
      }
      const r = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [user.id]);
      if (!r.rows[0] || !verifyPassword(currentPassword, r.rows[0].password_hash)) {
        return res.status(401).json({ error: 'Mật khẩu hiện tại không đúng.' });
      }
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [
        hashPassword(newPassword),
        user.id,
      ]);
      return res.status(200).json({ ok: true });
    }

    // 8. Image Upload -> Vercel Blob (fallback to dataUrl if blob token unset)
    if (method === 'POST' && pathname === '/api/upload') {
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Chỉ Quản trị viên mới được tải ảnh sản phẩm lên.' });
      }
      const { dataUrl = '' } = req.body || {};
      const match = String(dataUrl).match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i);
      if (!match) {
        return res.status(400).json({ error: 'Định dạng ảnh không hợp lệ (hỗ trợ JPG, PNG, WebP).' });
      }
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const fmt = match[1].toLowerCase();
        const ext = fmt === 'jpeg' ? 'jpg' : fmt;
        const contentType = fmt === 'jpg' ? 'image/jpeg' : `image/${fmt}`;
        const buffer = Buffer.from(match[2], 'base64');
        const blob = await put(
          `products/item-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`,
          buffer,
          { access: 'public', contentType }
        );
        return res.status(201).json({ url: blob.url });
      }
      return res.status(201).json({ url: dataUrl });
    }

    // 9. Products CRUD
    if (pathname === '/api/products') {
      if (method === 'GET') {
        const user = await getAuthUser(req);
        const includeHidden = url.searchParams.get('all') === '1' && user?.role === 'admin';
        const r = includeHidden
          ? await query('SELECT * FROM products ORDER BY created_at DESC')
          : await query('SELECT * FROM products WHERE is_published = TRUE ORDER BY created_at DESC');
        return res.status(200).json(r.rows.map(mapProductRow));
      }

      if (method === 'POST') {
        const user = await getAuthUser(req);
        if (!user || user.role !== 'admin') {
          return res.status(403).json({ error: 'Chỉ Admin mới được đăng sản phẩm mới.' });
        }
        const p = req.body || {};
        const id = p.id || `2h-${Date.now()}`;
        const r = await query(
          `INSERT INTO products (
            id, sku, name, category, category_label, sub_category, style, origin_brand,
            condition_score, condition_label, condition_note, price, original_price,
            is_new, is_published, is_sold_out, size_guide_type, size, fit_suggestion,
            measurements, color_key, color_name, color_hex, image, material,
            care_instructions, description, highlights
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,TRUE,FALSE,$15,$16,$17,
            $18::jsonb,$19,$20,$21,$22,$23,$24::jsonb,$25,$26::jsonb
          ) RETURNING *`,
          [
            id, p.sku || `2H-${Math.floor(100 + Math.random() * 900)}`, p.name,
            p.category || 'nam', p.categoryLabel || 'Nam', p.subCategory || 'Đồ 2Hand',
            p.style || 'Vintage', p.originBrand || 'Tuyển chọn 2Hand', p.conditionScore ?? 95,
            p.conditionLabel || '95% · Rất đẹp', p.conditionNote || '', Number(p.price) || 0,
            p.originalPrice ? Number(p.originalPrice) : null, Boolean(p.isNew),
            p.sizeGuideType || 'men-top', p.size || 'M', p.fitSuggestion || '',
            JSON.stringify(p.measurements || {}), p.colorKey || 'be', p.colorName || 'Be / Kem',
            p.colorHex || '#D4C3AA', p.image || '/images/men-jacket.jpg', p.material || '',
            JSON.stringify(p.careInstructions || []), p.description || '',
            JSON.stringify(p.highlights || []),
          ]
        );
        return res.status(201).json(mapProductRow(r.rows[0]));
      }
    }

    const prodMatch = pathname.match(/^\/api\/products\/([^/]+)$/);
    if (prodMatch) {
      const prodId = decodeURIComponent(prodMatch[1]);
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Chỉ Admin mới được chỉnh sửa hoặc xóa sản phẩm.' });
      }
      if (method === 'PATCH') {
        const curRes = await query('SELECT * FROM products WHERE id = $1', [prodId]);
        if (curRes.rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy sản phẩm.' });
        const next = { ...mapProductRow(curRes.rows[0]), ...(req.body || {}) };
        const soldAtVal = next.isSoldOut ? next.soldAt || formatViDateTime() : null;
        const upd = await query(
          `UPDATE products SET
            name=$1, category=$2, category_label=$3, sub_category=$4, style=$5, origin_brand=$6,
            condition_score=$7, condition_label=$8, condition_note=$9, price=$10, original_price=$11,
            is_new=$12, is_published=$13, is_sold_out=$14, sold_at=$15, size_guide_type=$16,
            size=$17, fit_suggestion=$18, measurements=$19::jsonb, color_key=$20, color_name=$21,
            color_hex=$22, image=$23, description=$24
           WHERE id = $25 RETURNING *`,
          [
            next.name, next.category, next.categoryLabel, next.subCategory, next.style,
            next.originBrand, next.conditionScore, next.conditionLabel, next.conditionNote,
            Number(next.price), next.originalPrice ? Number(next.originalPrice) : null,
            Boolean(next.isNew), Boolean(next.isPublished), Boolean(next.isSoldOut), soldAtVal,
            next.sizeGuideType, next.size, next.fitSuggestion, JSON.stringify(next.measurements || {}),
            next.colorKey, next.colorName, next.colorHex, next.image, next.description, prodId,
          ]
        );
        return res.status(200).json(mapProductRow(upd.rows[0]));
      }
      if (method === 'DELETE') {
        await query('DELETE FROM products WHERE id = $1', [prodId]);
        return res.status(200).json({ ok: true });
      }
    }

    // 10. Orders + Atomic 1-of-1 Sold Out Transaction
    if (pathname === '/api/orders') {
      if (method === 'GET') {
        const user = await getAuthUser(req);
        if (!user) return res.status(401).json({ error: 'Vui lòng đăng nhập để xem đơn hàng.' });
        const r =
          user.role === 'admin'
            ? await query('SELECT * FROM orders ORDER BY created_ts DESC')
            : await query(
                `SELECT * FROM orders
                 WHERE LOWER(customer_email) = $1 OR (customer_phone <> '' AND customer_phone = $2)
                 ORDER BY created_ts DESC`,
                [user.email.toLowerCase(), user.phone || '__none__']
              );
        return res.status(200).json(r.rows.map(mapOrderRow));
      }

      if (method === 'POST') {
        const user = await getAuthUser(req);
        const body = req.body || {};
        const items = Array.isArray(body.items) ? body.items : [];
        if (items.length === 0) return res.status(400).json({ error: 'Giỏ hàng trống.' });
        if (!body.customerName?.trim() || !body.customerPhone?.trim() || !body.shippingAddress?.trim()) {
          return res.status(400).json({ error: 'Vui lòng nhập đầy đủ họ tên, SĐT và địa chỉ nhận hàng.' });
        }

        const orderId = `2H-${Math.floor(100000 + Math.random() * 900000)}`;
        const createdAt = formatViDateTime();

        const client = await getPool().connect();
        try {
          await client.query('BEGIN');
          const verifiedItems = [];
          let subtotal = 0;

          for (const reqItem of items) {
            const pRes = await client.query(
              'SELECT * FROM products WHERE id = $1 AND is_published = TRUE FOR UPDATE',
              [reqItem.productId]
            );
            const row = pRes.rows[0];
            if (!row) {
              await client.query('ROLLBACK');
              return res.status(404).json({ error: `Sản phẩm "${reqItem.name}" không còn tồn tại.` });
            }
            if (row.is_sold_out) {
              await client.query('ROLLBACK');
              return res.status(409).json({
                error: `Rất tiếc, "${row.name}" vừa có người nhanh tay chốt trước (SOLD OUT)!`,
              });
            }
            subtotal += Number(row.price);
            verifiedItems.push({
              productId: row.id,
              name: row.name,
              colorName: String(row.color_name || '').split('(')[0].trim(),
              size: row.size,
              quantity: 1,
              price: Number(row.price),
            });
            await client.query(
              'UPDATE products SET is_sold_out = TRUE, sold_at = $1, sold_to_order_id = $2 WHERE id = $3',
              [createdAt, orderId, row.id]
            );
          }

          const cfgRes = await client.query('SELECT data FROM store_config WHERE id = 1');
          const cfg = cfgRes.rows[0]?.data || DEFAULT_STORE_CONFIG;
          const freeShip = cfg.freeShipThreshold ?? 499000;
          const total = subtotal + (subtotal >= freeShip ? 0 : 30000);

          const ordRes = await client.query(
            `INSERT INTO orders (id, customer_email, customer_name, customer_phone, shipping_address, status, total, items, created_at)
             VALUES ($1,$2,$3,$4,$5,'pending',$6,$7::jsonb,$8) RETURNING *`,
            [
              orderId, user?.email || body.customerEmail || 'khach.mua.le@shop.vn',
              body.customerName.trim(), body.customerPhone.trim(), body.shippingAddress.trim(),
              total, JSON.stringify(verifiedItems), createdAt,
            ]
          );

          await client.query('COMMIT');
          return res.status(201).json({ order: mapOrderRow(ordRes.rows[0]) });
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      }
    }

    const orderStatusMatch = pathname.match(/^\/api\/orders\/([^/]+)$/);
    if (orderStatusMatch && method === 'PATCH') {
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Chỉ Admin mới được cập nhật trạng thái đơn hàng.' });
      }
      const orderId = decodeURIComponent(orderStatusMatch[1]);
      const r = await query('UPDATE orders SET status = $1 WHERE id = $2 RETURNING *', [
        req.body?.status,
        orderId,
      ]);
      if (r.rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
      return res.status(200).json(mapOrderRow(r.rows[0]));
    }

    const restockMatch = pathname.match(/^\/api\/orders\/([^/]+)\/restock$/);
    if (restockMatch && method === 'POST') {
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Chỉ Admin mới được mở bán lại sản phẩm.' });
      }
      const orderId = decodeURIComponent(restockMatch[1]);
      const r = await query('SELECT items FROM orders WHERE id = $1', [orderId]);
      if (r.rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
      for (const item of r.rows[0].items || []) {
        if (item.productId) {
          await query(
            'UPDATE products SET is_sold_out = FALSE, sold_at = NULL, sold_to_order_id = NULL WHERE id = $1',
            [item.productId]
          );
        }
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(404).json({ error: 'API route not found' });
  } catch (err) {
    console.error('[Vercel API Error]', err);
    return res.status(500).json({ error: err?.message || 'Lỗi máy chủ Vercel API.' });
  }
}
