import crypto from 'node:crypto';
import type { Config, Context } from '@netlify/functions';
import { getDatabase } from '@netlify/database';
import { getStore } from '@netlify/blobs';
import { PRODUCTS as SEED_PRODUCTS } from '../../src/data/products.js';
import {
  DEFAULT_STORE_CONFIG,
  DEMO_ACCOUNTS,
  INITIAL_ORDERS,
} from '../../src/data/storeConfig.js';

const db = getDatabase();
let seededPromise: Promise<void> | null = null;

function getTokenSecret(): string {
  return Netlify.env.get('AUTH_SECRET') || 'remora-2hand-fallback-signing-key-2026';
}

function getOAuthAvailability() {
  const google = Boolean(
    Netlify.env.get('GOOGLE_CLIENT_ID') && Netlify.env.get('GOOGLE_CLIENT_SECRET')
  );
  const zalo = Boolean(
    Netlify.env.get('ZALO_APP_ID') && Netlify.env.get('ZALO_APP_SECRET')
  );
  return { google, zalo };
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = String(storedHash || '').split(':');
  if (!salt || !key) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

function signPayload(payload: Record<string, any>, ttlMs = 7 * 24 * 60 * 60 * 1000): string {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + ttlMs })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', getTokenSecret())
    .update(body)
    .digest('base64url');
  return `${body}.${sig}`;
}

function verifySignedPayload(token: string): Record<string, any> | null {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = crypto
    .createHmac('sha256', getTokenSecret())
    .update(body)
    .digest('base64url');
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

function signToken(payload: { id: string; role: string }): string {
  return signPayload(payload);
}

function verifyToken(token: string): { id: string; role: string; exp?: number } | null {
  const parsed = verifySignedPayload(token);
  if (!parsed?.id || !parsed?.role) return null;
  return parsed as { id: string; role: string; exp?: number };
}

function mapUserRow(row: any) {
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

async function getAuthUser(req: Request) {
  const header = req.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  const payload = verifyToken(header.slice(7).trim());
  if (!payload?.id) return null;
  const rows = await db.sql`
    SELECT id, name, email, role, phone, auth_provider, avatar_url
    FROM users WHERE id = ${payload.id} LIMIT 1
  `;
  return rows[0] ? mapUserRow(rows[0]) : null;
}

function formatViDateTime(): string {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const d = String(now.getUTCDate()).padStart(2, '0');
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const y = now.getUTCFullYear();
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const mm = String(now.getUTCMinutes()).padStart(2, '0');
  return `${d}/${m}/${y} ${hh}:${mm}`;
}

function mapProductRow(row: any) {
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

function mapOrderRow(row: any) {
  return {
    id: row.id,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    shippingAddress: row.shipping_address,
    status: row.status,
    total: row.total,
    items: row.items || [],
    createdAt: row.created_at,
  };
}

async function upsertSocialCustomer({
  provider,
  providerId,
  name,
  email,
  phone = '',
  avatarUrl = '',
}: {
  provider: 'google' | 'zalo';
  providerId: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
}) {
  const cleanEmail = email.trim().toLowerCase();

  // Check by (auth_provider, provider_id) first
  const byProvider = await db.sql`
    SELECT * FROM users WHERE auth_provider = ${provider} AND provider_id = ${providerId} LIMIT 1
  `;
  if (byProvider[0]) {
    if (byProvider[0].role === 'admin') {
      throw new Error('Tài khoản Quản trị viên vui lòng đăng nhập bằng mật khẩu.');
    }
    const updated = await db.sql`
      UPDATE users
      SET name = ${name || byProvider[0].name},
          avatar_url = ${avatarUrl || byProvider[0].avatar_url},
          phone = ${phone || byProvider[0].phone}
      WHERE id = ${byProvider[0].id}
      RETURNING *
    `;
    return mapUserRow(updated[0]);
  }

  // Check if email already exists
  const byEmail = await db.sql`
    SELECT * FROM users WHERE LOWER(email) = ${cleanEmail} LIMIT 1
  `;
  if (byEmail[0]) {
    if (byEmail[0].role === 'admin') {
      throw new Error('Email này thuộc Quản trị viên — vui lòng đăng nhập bằng mật khẩu Admin.');
    }
    const updated = await db.sql`
      UPDATE users
      SET auth_provider = ${provider},
          provider_id = ${providerId},
          name = ${name || byEmail[0].name},
          avatar_url = ${avatarUrl || byEmail[0].avatar_url},
          phone = ${phone || byEmail[0].phone}
      WHERE id = ${byEmail[0].id}
      RETURNING *
    `;
    return mapUserRow(updated[0]);
  }

  // Create brand-new customer account
  const newId = `${provider}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const randomSecret = crypto.randomBytes(24).toString('hex');
  const inserted = await db.sql`
    INSERT INTO users (id, name, email, password_hash, role, phone, auth_provider, provider_id, avatar_url)
    VALUES (
      ${newId},
      ${name},
      ${cleanEmail},
      ${hashPassword(randomSecret)},
      'customer',
      ${phone},
      ${provider},
      ${providerId},
      ${avatarUrl}
    )
    RETURNING *
  `;
  return mapUserRow(inserted[0]);
}

async function ensureSeeded(): Promise<void> {
  if (!seededPromise) {
    seededPromise = (async () => {
      const cfgRows = await db.sql`SELECT id FROM store_config WHERE id = 1`;
      if (cfgRows.length === 0) {
        await db.sql`
          INSERT INTO store_config (id, data)
          VALUES (1, ${JSON.stringify(DEFAULT_STORE_CONFIG)}::jsonb)
          ON CONFLICT (id) DO NOTHING
        `;
      }

      const userCountRows = await db.sql`SELECT COUNT(*)::int AS c FROM users`;
      if ((userCountRows[0]?.c ?? 0) === 0) {
        for (const acc of DEMO_ACCOUNTS) {
          await db.sql`
            INSERT INTO users (id, name, email, password_hash, role, phone, auth_provider)
            VALUES (
              ${acc.id},
              ${acc.name},
              ${acc.email.toLowerCase()},
              ${hashPassword(acc.password)},
              ${acc.role},
              ${acc.phone || ''},
              'email'
            )
            ON CONFLICT (email) DO NOTHING
          `;
        }
      }

      const prodCountRows = await db.sql`SELECT COUNT(*)::int AS c FROM products`;
      if ((prodCountRows[0]?.c ?? 0) === 0) {
        for (let idx = 0; idx < SEED_PRODUCTS.length; idx++) {
          const p = SEED_PRODUCTS[idx];
          const ts = new Date(Date.now() - idx * 60000).toISOString();
          await db.sql`
            INSERT INTO products (
              id, sku, name, category, category_label, sub_category, style, origin_brand,
              condition_score, condition_label, condition_note, price, original_price,
              is_new, is_published, is_sold_out, sold_at, sold_to_order_id, size_guide_type,
              size, fit_suggestion, measurements, color_key, color_name, color_hex, image,
              material, care_instructions, description, highlights, created_at
            ) VALUES (
              ${p.id}, ${p.sku || ''}, ${p.name}, ${p.category}, ${p.categoryLabel || ''},
              ${p.subCategory || ''}, ${p.style || ''}, ${p.originBrand || ''},
              ${p.conditionScore ?? 95}, ${p.conditionLabel || ''}, ${p.conditionNote || ''},
              ${p.price}, ${p.originalPrice ?? null},
              ${Boolean(p.isNew)}, ${p.isPublished !== false}, ${Boolean(p.isSoldOut)},
              ${p.soldAt || null}, ${p.soldToOrderId || null}, ${p.sizeGuideType || 'men-top'},
              ${p.size || 'M'}, ${p.fitSuggestion || ''}, ${JSON.stringify(p.measurements || {})}::jsonb,
              ${p.colorKey || 'be'}, ${p.colorName || ''}, ${p.colorHex || '#D4C3AA'}, ${p.image},
              ${p.material || ''}, ${JSON.stringify(p.careInstructions || [])}::jsonb,
              ${p.description || ''}, ${JSON.stringify(p.highlights || [])}::jsonb, ${ts}
            )
            ON CONFLICT (id) DO NOTHING
          `;
        }
      }

      const orderCountRows = await db.sql`SELECT COUNT(*)::int AS c FROM orders`;
      if ((orderCountRows[0]?.c ?? 0) === 0) {
        for (const o of INITIAL_ORDERS) {
          await db.sql`
            INSERT INTO orders (
              id, customer_email, customer_name, customer_phone, shipping_address,
              status, total, items, created_at
            ) VALUES (
              ${o.id}, ${o.customerEmail || ''}, ${o.customerName}, ${o.customerPhone || ''},
              ${o.shippingAddress || ''}, ${o.status || 'pending'}, ${o.total},
              ${JSON.stringify(o.items || [])}::jsonb, ${o.createdAt}
            )
            ON CONFLICT (id) DO NOTHING
          `;
        }
      }
    })().catch((err) => {
      seededPromise = null;
      throw err;
    });
  }
  await seededPromise;
}

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const method = req.method;
  const origin = url.origin;

  try {
    // Serve uploaded images from Netlify Blobs
    const uploadGetMatch = pathname.match(/^\/api\/uploads\/([^/]+)$/);
    if (uploadGetMatch && method === 'GET') {
      const key = decodeURIComponent(uploadGetMatch[1]);
      const store = getStore('product-uploads');
      const entry = await store.getWithMetadata(key, { type: 'arrayBuffer' });
      if (entry === null) {
        return Response.json({ error: 'Không tìm thấy ảnh.' }, { status: 404 });
      }
      const contentType = (entry.metadata?.contentType as string) || 'image/jpeg';
      return new Response(entry.data, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    await ensureSeeded();

    // 1. Health check
    if (method === 'GET' && pathname === '/api/health') {
      return Response.json({
        ok: true,
        mode: 'netlify-postgres',
        oauth: getOAuthAvailability(),
      });
    }

    // 2. OAuth Providers availability
    if (method === 'GET' && pathname === '/api/auth/providers') {
      return Response.json({
        ...getOAuthAvailability(),
        callbacks: {
          google: `${origin}/api/auth/oauth/google/callback`,
          zalo: `${origin}/api/auth/oauth/zalo/callback`,
        },
      });
    }

    // 3. Official Google (Gmail) OAuth2 Start & Callback
    if (method === 'GET' && pathname === '/api/auth/oauth/google/start') {
      const clientId = Netlify.env.get('GOOGLE_CLIENT_ID');
      if (!clientId) {
        return Response.redirect(
          `${origin}/#auth-error?msg=${encodeURIComponent('Google OAuth chưa được cấu hình Client ID.')}`,
          302
        );
      }
      const state = signPayload({ provider: 'google', nonce: crypto.randomBytes(8).toString('hex') }, 10 * 60 * 1000);
      const redirectUri = `${origin}/api/auth/oauth/google/callback`;
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'openid email profile');
      authUrl.searchParams.set('prompt', 'select_account');
      authUrl.searchParams.set('state', state);
      return Response.redirect(authUrl.toString(), 302);
    }

    if (method === 'GET' && pathname === '/api/auth/oauth/google/callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state') || '';
      const verifiedState = verifySignedPayload(state);
      const clientId = Netlify.env.get('GOOGLE_CLIENT_ID');
      const clientSecret = Netlify.env.get('GOOGLE_CLIENT_SECRET');
      if (!code || !verifiedState || verifiedState.provider !== 'google' || !clientId || !clientSecret) {
        return Response.redirect(
          `${origin}/#auth-error?msg=${encodeURIComponent('Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn.')}`,
          302
        );
      }

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: `${origin}/api/auth/oauth/google/callback`,
          grant_type: 'authorization_code',
        }),
      });
      const tokenData: any = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        return Response.redirect(
          `${origin}/#auth-error?msg=${encodeURIComponent('Không thể xác thực mã đăng nhập Google.')}`,
          302
        );
      }

      const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const profile: any = await profileRes.json();
      if (!profile?.email) {
        return Response.redirect(
          `${origin}/#auth-error?msg=${encodeURIComponent('Không lấy được địa chỉ Gmail từ Google.')}`,
          302
        );
      }

      const user = await upsertSocialCustomer({
        provider: 'google',
        providerId: String(profile.sub || profile.email),
        name: profile.name || profile.email.split('@')[0],
        email: profile.email,
        avatarUrl: profile.picture || '',
      });
      const sessionToken = signToken({ id: user.id, role: user.role });
      return Response.redirect(
        `${origin}/#auth-callback?token=${encodeURIComponent(sessionToken)}&provider=google`,
        302
      );
    }

    // 4. Official Zalo OAuth v4 (with PKCE) Start & Callback
    if (method === 'GET' && pathname === '/api/auth/oauth/zalo/start') {
      const appId = Netlify.env.get('ZALO_APP_ID');
      if (!appId) {
        return Response.redirect(
          `${origin}/#auth-error?msg=${encodeURIComponent('Zalo OAuth chưa được cấu hình App ID.')}`,
          302
        );
      }
      const codeVerifier = crypto.randomBytes(32).toString('base64url');
      const codeChallenge = crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');
      const state = signPayload({ provider: 'zalo', codeVerifier }, 10 * 60 * 1000);
      const redirectUri = `${origin}/api/auth/oauth/zalo/callback`;

      const zaloUrl = new URL('https://oauth.zaloapp.com/v4/permission');
      zaloUrl.searchParams.set('app_id', appId);
      zaloUrl.searchParams.set('redirect_uri', redirectUri);
      zaloUrl.searchParams.set('code_challenge', codeChallenge);
      zaloUrl.searchParams.set('state', state);
      return Response.redirect(zaloUrl.toString(), 302);
    }

    if (method === 'GET' && pathname === '/api/auth/oauth/zalo/callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state') || '';
      const verifiedState = verifySignedPayload(state);
      const appId = Netlify.env.get('ZALO_APP_ID');
      const appSecret = Netlify.env.get('ZALO_APP_SECRET');
      if (!code || !verifiedState || verifiedState.provider !== 'zalo' || !appId || !appSecret) {
        return Response.redirect(
          `${origin}/#auth-error?msg=${encodeURIComponent('Phiên đăng nhập Zalo không hợp lệ hoặc đã hết hạn.')}`,
          302
        );
      }

      const tokenRes = await fetch('https://oauth.zaloapp.com/v4/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          secret_key: appSecret,
        },
        body: new URLSearchParams({
          code,
          app_id: appId,
          grant_type: 'authorization_code',
          code_verifier: String(verifiedState.codeVerifier),
        }),
      });
      const tokenData: any = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        return Response.redirect(
          `${origin}/#auth-error?msg=${encodeURIComponent('Không thể lấy Access Token từ Zalo.')}`,
          302
        );
      }

      const profileRes = await fetch(
        'https://graph.zalo.me/v2.0/me?fields=id,name,picture',
        { headers: { access_token: tokenData.access_token } }
      );
      const profile: any = await profileRes.json();
      if (!profile?.id) {
        return Response.redirect(
          `${origin}/#auth-error?msg=${encodeURIComponent('Không lấy được thông tin tài khoản Zalo.')}`,
          302
        );
      }

      const user = await upsertSocialCustomer({
        provider: 'zalo',
        providerId: String(profile.id),
        name: profile.name || `Khách Zalo ${String(profile.id).slice(-4)}`,
        email: `zalo_${profile.id}@zalo.remora.vn`,
        avatarUrl: profile.picture?.data?.url || '',
      });
      const sessionToken = signToken({ id: user.id, role: user.role });
      return Response.redirect(
        `${origin}/#auth-callback?token=${encodeURIComponent(sessionToken)}&provider=zalo`,
        302
      );
    }

    // 5. Fast Customer Sign-in with Gmail or Zalo Phone (works immediately without waiting for OAuth approval!)
    if (method === 'POST' && pathname === '/api/auth/social-quick') {
      const { provider, email = '', phone = '', name = '' } = await req.json();
      if (provider !== 'google' && provider !== 'zalo') {
        return Response.json({ error: 'Nhà cung cấp đăng nhập không hợp lệ.' }, { status: 400 });
      }

      if (provider === 'google') {
        const cleanGmail = String(email).trim().toLowerCase();
        if (!/^[^\s@]+@gmail\.com$/i.test(cleanGmail)) {
          return Response.json(
            { error: 'Vui lòng nhập địa chỉ Gmail hợp lệ (kết thúc bằng @gmail.com).' },
            { status: 400 }
          );
        }
        const displayName = String(name).trim() || cleanGmail.split('@')[0];
        const user = await upsertSocialCustomer({
          provider: 'google',
          providerId: cleanGmail,
          name: displayName,
          email: cleanGmail,
        });
        const token = signToken({ id: user.id, role: user.role });
        return Response.json({ user, token });
      }

      // Zalo quick sign-in via Zalo Phone Number
      const cleanPhone = String(phone).replace(/\s+/g, '');
      if (!/^(0|\+84)\d{8,10}$/.test(cleanPhone)) {
        return Response.json(
          { error: 'Vui lòng nhập số điện thoại Zalo hợp lệ (VD: 0912345678).' },
          { status: 400 }
        );
      }
      const normalizedPhone = cleanPhone.replace(/^\+84/, '0');
      const displayName = String(name).trim() || `Khách Zalo ${normalizedPhone.slice(-4)}`;
      const user = await upsertSocialCustomer({
        provider: 'zalo',
        providerId: normalizedPhone,
        name: displayName,
        email: `zalo_${normalizedPhone}@zalo.remora.vn`,
        phone: normalizedPhone,
      });
      const token = signToken({ id: user.id, role: user.role });
      return Response.json({ user, token });
    }

    // 6. Store Config
    if (pathname === '/api/config') {
      if (method === 'GET') {
        const rows = await db.sql`SELECT data FROM store_config WHERE id = 1`;
        const data = rows[0]?.data || DEFAULT_STORE_CONFIG;
        return Response.json({ ...DEFAULT_STORE_CONFIG, ...data });
      }
      if (method === 'PUT') {
        const user = await getAuthUser(req);
        if (!user || user.role !== 'admin') {
          return Response.json(
            { error: 'Chỉ Quản trị viên (Admin) mới được sửa cài đặt cửa hàng.' },
            { status: 403 }
          );
        }
        const body = await req.json();
        const merged = { ...DEFAULT_STORE_CONFIG, ...body };
        await db.sql`
          INSERT INTO store_config (id, data, updated_at)
          VALUES (1, ${JSON.stringify(merged)}::jsonb, NOW())
          ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
        `;
        return Response.json(merged);
      }
    }

    // 7. Standard Email / Password Auth
    if (method === 'GET' && pathname === '/api/auth/me') {
      const user = await getAuthUser(req);
      return Response.json({ user });
    }

    if (method === 'POST' && pathname === '/api/auth/change-password') {
      const user = await getAuthUser(req);
      if (!user) {
        return Response.json({ error: 'Vui lòng đăng nhập lại.' }, { status: 401 });
      }
      const { currentPassword = '', newPassword = '' } = await req.json();
      if (String(newPassword).length < 6) {
        return Response.json(
          { error: 'Mật khẩu mới cần tối thiểu 6 ký tự.' },
          { status: 400 }
        );
      }
      const rows = await db.sql`SELECT * FROM users WHERE id = ${user.id} LIMIT 1`;
      if (!rows[0] || !verifyPassword(currentPassword, rows[0].password_hash)) {
        return Response.json({ error: 'Mật khẩu hiện tại không đúng.' }, { status: 401 });
      }
      await db.sql`
        UPDATE users SET password_hash = ${hashPassword(newPassword)} WHERE id = ${user.id}
      `;
      return Response.json({ ok: true });
    }

    if (method === 'POST' && pathname === '/api/auth/login') {
      const { email = '', password = '' } = await req.json();
      const rows = await db.sql`
        SELECT * FROM users WHERE LOWER(email) = ${email.trim().toLowerCase()} LIMIT 1
      `;
      const row = rows[0];
      if (!row || !verifyPassword(password, row.password_hash)) {
        return Response.json({ error: 'Email hoặc mật khẩu không chính xác.' }, { status: 401 });
      }
      const user = mapUserRow(row);
      const token = signToken({ id: user.id, role: user.role });
      return Response.json({ user, token });
    }

    if (method === 'POST' && pathname === '/api/auth/register') {
      const { name = '', email = '', password = '' } = await req.json();
      const cleanEmail = email.trim().toLowerCase();
      if (!name.trim() || !cleanEmail || password.length < 4) {
        return Response.json(
          { error: 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu (>= 4 ký tự).' },
          { status: 400 }
        );
      }
      const existing = await db.sql`SELECT id FROM users WHERE LOWER(email) = ${cleanEmail}`;
      if (existing.length > 0) {
        return Response.json({ error: 'Email này đã được đăng ký trước đó.' }, { status: 409 });
      }
      const newId = `user-${Date.now()}`;
      const rows = await db.sql`
        INSERT INTO users (id, name, email, password_hash, role, phone, auth_provider)
        VALUES (${newId}, ${name.trim()}, ${cleanEmail}, ${hashPassword(password)}, 'customer', '', 'email')
        RETURNING *
      `;
      const user = mapUserRow(rows[0]);
      const token = signToken({ id: user.id, role: user.role });
      return Response.json({ user, token }, { status: 201 });
    }

    // 8. Image Upload -> Netlify Blobs (Admin only)
    if (method === 'POST' && pathname === '/api/upload') {
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') {
        return Response.json(
          { error: 'Chỉ Quản trị viên mới được tải ảnh sản phẩm lên.' },
          { status: 403 }
        );
      }
      const { dataUrl = '' } = await req.json();
      const match = String(dataUrl).match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i);
      if (!match) {
        return Response.json(
          { error: 'Định dạng ảnh không hợp lệ (hỗ trợ JPG, PNG, WebP).' },
          { status: 400 }
        );
      }
      const fmt = match[1].toLowerCase();
      const ext = fmt === 'jpeg' ? 'jpg' : fmt;
      const contentType = fmt === 'jpg' ? 'image/jpeg' : `image/${fmt}`;
      const buffer = Buffer.from(match[2], 'base64');
      const key = `item-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;

      const store = getStore('product-uploads');
      await store.set(
        key,
        buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
        { metadata: { contentType } }
      );

      return Response.json({ url: `/api/uploads/${key}` }, { status: 201 });
    }

    // 9. Products CRUD
    if (pathname === '/api/products') {
      if (method === 'GET') {
        const user = await getAuthUser(req);
        const includeHidden = url.searchParams.get('all') === '1' && user?.role === 'admin';
        const rows = includeHidden
          ? await db.sql`SELECT * FROM products ORDER BY created_at DESC`
          : await db.sql`SELECT * FROM products WHERE is_published = TRUE ORDER BY created_at DESC`;
        return Response.json(rows.map(mapProductRow));
      }

      if (method === 'POST') {
        const user = await getAuthUser(req);
        if (!user || user.role !== 'admin') {
          return Response.json({ error: 'Chỉ Admin mới được đăng sản phẩm mới.' }, { status: 403 });
        }
        const p = await req.json();
        const id = p.id || `2h-${Date.now()}`;
        const rows = await db.sql`
          INSERT INTO products (
            id, sku, name, category, category_label, sub_category, style, origin_brand,
            condition_score, condition_label, condition_note, price, original_price,
            is_new, is_published, is_sold_out, size_guide_type, size, fit_suggestion,
            measurements, color_key, color_name, color_hex, image, material,
            care_instructions, description, highlights
          ) VALUES (
            ${id},
            ${p.sku || `2H-${Math.floor(100 + Math.random() * 900)}`},
            ${p.name},
            ${p.category || 'nam'},
            ${p.categoryLabel || 'Nam'},
            ${p.subCategory || 'Đồ 2Hand'},
            ${p.style || 'Vintage'},
            ${p.originBrand || 'Tuyển chọn 2Hand'},
            ${p.conditionScore ?? 95},
            ${p.conditionLabel || '95% · Rất đẹp'},
            ${p.conditionNote || ''},
            ${Number(p.price) || 0},
            ${p.originalPrice ? Number(p.originalPrice) : null},
            ${Boolean(p.isNew)},
            TRUE,
            FALSE,
            ${p.sizeGuideType || 'men-top'},
            ${p.size || 'M'},
            ${p.fitSuggestion || ''},
            ${JSON.stringify(p.measurements || {})}::jsonb,
            ${p.colorKey || 'be'},
            ${p.colorName || 'Be / Kem'},
            ${p.colorHex || '#D4C3AA'},
            ${p.image || '/images/men-jacket.jpg'},
            ${p.material || ''},
            ${JSON.stringify(p.careInstructions || [])}::jsonb,
            ${p.description || ''},
            ${JSON.stringify(p.highlights || [])}::jsonb
          )
          RETURNING *
        `;
        return Response.json(mapProductRow(rows[0]), { status: 201 });
      }
    }

    const productMatch = pathname.match(/^\/api\/products\/([^/]+)$/);
    if (productMatch) {
      const prodId = decodeURIComponent(productMatch[1]);
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') {
        return Response.json(
          { error: 'Chỉ Admin mới được chỉnh sửa hoặc xóa sản phẩm.' },
          { status: 403 }
        );
      }

      if (method === 'PATCH') {
        const existingRows = await db.sql`SELECT * FROM products WHERE id = ${prodId}`;
        if (existingRows.length === 0) {
          return Response.json({ error: 'Không tìm thấy sản phẩm.' }, { status: 404 });
        }
        const current = mapProductRow(existingRows[0]);
        const patch = await req.json();
        const next = { ...current, ...patch };
        const soldAtVal = next.isSoldOut ? next.soldAt || formatViDateTime() : null;

        const updatedRows = await db.sql`
          UPDATE products SET
            name = ${next.name},
            category = ${next.category},
            category_label = ${next.categoryLabel},
            sub_category = ${next.subCategory},
            style = ${next.style},
            origin_brand = ${next.originBrand},
            condition_score = ${next.conditionScore},
            condition_label = ${next.conditionLabel},
            condition_note = ${next.conditionNote},
            price = ${Number(next.price)},
            original_price = ${next.originalPrice ? Number(next.originalPrice) : null},
            is_new = ${Boolean(next.isNew)},
            is_published = ${Boolean(next.isPublished)},
            is_sold_out = ${Boolean(next.isSoldOut)},
            sold_at = ${soldAtVal},
            size_guide_type = ${next.sizeGuideType},
            size = ${next.size},
            fit_suggestion = ${next.fitSuggestion},
            measurements = ${JSON.stringify(next.measurements || {})}::jsonb,
            color_key = ${next.colorKey},
            color_name = ${next.colorName},
            color_hex = ${next.colorHex},
            image = ${next.image},
            description = ${next.description}
          WHERE id = ${prodId}
          RETURNING *
        `;
        return Response.json(mapProductRow(updatedRows[0]));
      }

      if (method === 'DELETE') {
        await db.sql`DELETE FROM products WHERE id = ${prodId}`;
        return Response.json({ ok: true });
      }
    }

    // 10. Orders + Atomic 1-of-1 Sold Out Transaction
    if (pathname === '/api/orders') {
      if (method === 'GET') {
        const user = await getAuthUser(req);
        if (!user) {
          return Response.json({ error: 'Vui lòng đăng nhập để xem đơn hàng.' }, { status: 401 });
        }
        const rows =
          user.role === 'admin'
            ? await db.sql`SELECT * FROM orders ORDER BY created_ts DESC`
            : await db.sql`
                SELECT * FROM orders
                WHERE LOWER(customer_email) = ${user.email.toLowerCase()}
                   OR (customer_phone <> '' AND customer_phone = ${user.phone || '__none__'})
                ORDER BY created_ts DESC
              `;
        return Response.json(rows.map(mapOrderRow));
      }

      if (method === 'POST') {
        const user = await getAuthUser(req);
        const body = await req.json();
        const items = Array.isArray(body.items) ? body.items : [];
        if (items.length === 0) {
          return Response.json({ error: 'Giỏ hàng trống.' }, { status: 400 });
        }
        if (!body.customerName?.trim() || !body.customerPhone?.trim() || !body.shippingAddress?.trim()) {
          return Response.json(
            { error: 'Vui lòng nhập đầy đủ họ tên, SĐT và địa chỉ nhận hàng.' },
            { status: 400 }
          );
        }

        const orderId = `2H-${Math.floor(100000 + Math.random() * 900000)}`;
        const createdAt = formatViDateTime();

        const client = await db.pool.connect();
        try {
          await client.query('BEGIN');

          const verifiedItems: any[] = [];
          let subtotal = 0;

          for (const reqItem of items) {
            const resProd = await client.query(
              'SELECT * FROM products WHERE id = $1 AND is_published = TRUE FOR UPDATE',
              [reqItem.productId]
            );
            const row = resProd.rows[0];
            if (!row) {
              await client.query('ROLLBACK');
              return Response.json(
                { error: `Sản phẩm "${reqItem.name}" không còn tồn tại.` },
                { status: 404 }
              );
            }
            if (row.is_sold_out) {
              await client.query('ROLLBACK');
              return Response.json(
                { error: `Rất tiếc, "${row.name}" vừa có người nhanh tay chốt trước (SOLD OUT)!` },
                { status: 409 }
              );
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
          const shippingFee = subtotal >= freeShip ? 0 : 30000;
          const total = subtotal + shippingFee;

          const orderRes = await client.query(
            `INSERT INTO orders (
              id, customer_email, customer_name, customer_phone, shipping_address,
              status, total, items, created_at
            ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7::jsonb, $8)
            RETURNING *`,
            [
              orderId,
              user?.email || body.customerEmail || 'khach.mua.le@shop.vn',
              body.customerName.trim(),
              body.customerPhone.trim(),
              body.shippingAddress.trim(),
              total,
              JSON.stringify(verifiedItems),
              createdAt,
            ]
          );

          await client.query('COMMIT');
          return Response.json({ order: mapOrderRow(orderRes.rows[0]) }, { status: 201 });
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
        return Response.json(
          { error: 'Chỉ Admin mới được cập nhật trạng thái đơn hàng.' },
          { status: 403 }
        );
      }
      const orderId = decodeURIComponent(orderStatusMatch[1]);
      const { status } = await req.json();
      const rows = await db.sql`
        UPDATE orders SET status = ${status} WHERE id = ${orderId} RETURNING *
      `;
      if (rows.length === 0) {
        return Response.json({ error: 'Không tìm thấy đơn hàng.' }, { status: 404 });
      }
      return Response.json(mapOrderRow(rows[0]));
    }

    const restockMatch = pathname.match(/^\/api\/orders\/([^/]+)\/restock$/);
    if (restockMatch && method === 'POST') {
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') {
        return Response.json(
          { error: 'Chỉ Admin mới được mở bán lại sản phẩm.' },
          { status: 403 }
        );
      }
      const orderId = decodeURIComponent(restockMatch[1]);
      const rows = await db.sql`SELECT items FROM orders WHERE id = ${orderId}`;
      if (rows.length === 0) {
        return Response.json({ error: 'Không tìm thấy đơn hàng.' }, { status: 404 });
      }
      const items = rows[0].items || [];
      for (const item of items) {
        if (item.productId) {
          await db.sql`
            UPDATE products
            SET is_sold_out = FALSE, sold_at = NULL, sold_to_order_id = NULL
            WHERE id = ${item.productId}
          `;
        }
      }
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'API route not found' }, { status: 404 });
  } catch (err: any) {
    console.error('[Netlify API Error]', err);
    return Response.json(
      { error: err?.message || 'Lỗi máy chủ Netlify API.' },
      { status: 500 }
    );
  }
};

export const config: Config = {
  path: '/api/*',
};
