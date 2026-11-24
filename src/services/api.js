import { createClient } from '@supabase/supabase-js';
import { DEFAULT_STORE_CONFIG } from '../data/storeConfig';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

const IS_LOCALHOST =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const IS_CLOUD_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const BACKEND_LABEL = IS_CLOUD_SUPABASE
  ? 'Supabase Cloud (PostgreSQL · 0đ/tháng)'
  : IS_LOCALHOST
    ? 'Backend Local Server (SQLite · Realtime)'
    : 'Netlify Cloud (PostgreSQL + Blobs · 24/7)';

const supabase = IS_CLOUD_SUPABASE ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const TOKEN_STORAGE_KEY = 'remora_auth_token';

function getToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {}
}

async function localFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Lỗi máy chủ (${res.status})`);
  }
  return data;
}

// Row mappers for Supabase snake_case <-> camelCase
function fromSupabaseProduct(row) {
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
    isNew: row.is_new,
    isPublished: row.is_published,
    isSoldOut: row.is_sold_out,
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
  };
}

function toSupabaseProduct(p) {
  const mapped = {};
  if (p.id !== undefined) mapped.id = p.id;
  if (p.sku !== undefined) mapped.sku = p.sku;
  if (p.name !== undefined) mapped.name = p.name;
  if (p.category !== undefined) mapped.category = p.category;
  if (p.categoryLabel !== undefined) mapped.category_label = p.categoryLabel;
  if (p.subCategory !== undefined) mapped.sub_category = p.subCategory;
  if (p.style !== undefined) mapped.style = p.style;
  if (p.originBrand !== undefined) mapped.origin_brand = p.originBrand;
  if (p.conditionScore !== undefined) mapped.condition_score = p.conditionScore;
  if (p.conditionLabel !== undefined) mapped.condition_label = p.conditionLabel;
  if (p.conditionNote !== undefined) mapped.condition_note = p.conditionNote;
  if (p.price !== undefined) mapped.price = Number(p.price);
  if (p.originalPrice !== undefined) mapped.original_price = p.originalPrice;
  if (p.isNew !== undefined) mapped.is_new = Boolean(p.isNew);
  if (p.isPublished !== undefined) mapped.is_published = Boolean(p.isPublished);
  if (p.isSoldOut !== undefined) mapped.is_sold_out = Boolean(p.isSoldOut);
  if (p.soldAt !== undefined) mapped.sold_at = p.soldAt;
  if (p.sizeGuideType !== undefined) mapped.size_guide_type = p.sizeGuideType;
  if (p.size !== undefined) mapped.size = p.size;
  if (p.fitSuggestion !== undefined) mapped.fit_suggestion = p.fitSuggestion;
  if (p.measurements !== undefined) mapped.measurements = p.measurements;
  if (p.colorKey !== undefined) mapped.color_key = p.colorKey;
  if (p.colorName !== undefined) mapped.color_name = p.colorName;
  if (p.colorHex !== undefined) mapped.color_hex = p.colorHex;
  if (p.image !== undefined) mapped.image = p.image;
  if (p.material !== undefined) mapped.material = p.material;
  if (p.careInstructions !== undefined) mapped.care_instructions = p.careInstructions;
  if (p.description !== undefined) mapped.description = p.description;
  if (p.highlights !== undefined) mapped.highlights = p.highlights;
  return mapped;
}

function fromSupabaseOrder(row) {
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

// ===================== UNIFIED API METHODS =====================
export const api = {
  // --- Auth ---
  async getCurrentUser() {
    if (IS_CLOUD_SUPABASE) {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) return null;
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      return profile
        ? {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            role: profile.role,
            phone: profile.phone || '',
          }
        : {
            id: data.user.id,
            name: data.user.email.split('@')[0],
            email: data.user.email,
            role: 'customer',
            phone: '',
          };
    }
    const res = await localFetch('/api/auth/me');
    return res.user || null;
  },

  async login(email, password) {
    if (IS_CLOUD_SUPABASE) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error('Email hoặc mật khẩu không chính xác.');
      const user = await api.getCurrentUser();
      return { user };
    }
    const res = await localFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(res.token);
    return { user: res.user };
  },

  async register({ name, email, password }) {
    if (IS_CLOUD_SUPABASE) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) throw new Error(error.message);
      const user = await api.getCurrentUser();
      return { user };
    }
    const res = await localFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    setToken(res.token);
    return { user: res.user };
  },

  async logout() {
    if (IS_CLOUD_SUPABASE) {
      await supabase.auth.signOut();
      return;
    }
    setToken('');
  },

  async getAuthProviders() {
    if (IS_CLOUD_SUPABASE) {
      return { google: true, zalo: false, callbacks: {} };
    }
    try {
      return await localFetch('/api/auth/providers');
    } catch {
      return { google: false, zalo: false, callbacks: {} };
    }
  },

  startOAuth(provider) {
    if (IS_CLOUD_SUPABASE && provider === 'google') {
      supabase.auth.signInWithOAuth({ provider: 'google' });
      return;
    }
    window.location.href = `/api/auth/oauth/${provider}/start`;
  },

  applyAuthCallbackToken(token) {
    setToken(token);
  },

  async socialQuickLogin({ provider, email, phone, name }) {
    const res = await localFetch('/api/auth/social-quick', {
      method: 'POST',
      body: JSON.stringify({ provider, email, phone, name }),
    });
    setToken(res.token);
    return { user: res.user };
  },

  async changePassword({ currentPassword, newPassword }) {
    return localFetch('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  // --- Store Config ---
  async getStoreConfig() {
    if (IS_CLOUD_SUPABASE) {
      const { data } = await supabase.from('store_config').select('data').eq('id', 1).single();
      return data?.data ? { ...DEFAULT_STORE_CONFIG, ...data.data } : DEFAULT_STORE_CONFIG;
    }
    return localFetch('/api/config');
  },

  async saveStoreConfig(config) {
    if (IS_CLOUD_SUPABASE) {
      const { error } = await supabase
        .from('store_config')
        .upsert({ id: 1, data: config, updated_at: new Date().toISOString() });
      if (error) throw new Error(error.message);
      return config;
    }
    return localFetch('/api/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  },

  // --- Products ---
  async getProducts({ includeHidden = false } = {}) {
    if (IS_CLOUD_SUPABASE) {
      let query = supabase.from('products').select('*').order('created_at', { ascending: false });
      if (!includeHidden) query = query.eq('is_published', true);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data || []).map(fromSupabaseProduct);
    }
    return localFetch(`/api/products${includeHidden ? '?all=1' : ''}`);
  },

  async createProduct(product) {
    if (IS_CLOUD_SUPABASE) {
      const { data, error } = await supabase
        .from('products')
        .insert(toSupabaseProduct(product))
        .select()
        .single();
      if (error) throw new Error(error.message);
      return fromSupabaseProduct(data);
    }
    return localFetch('/api/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  },

  async updateProduct(productId, patch) {
    if (IS_CLOUD_SUPABASE) {
      const { data, error } = await supabase
        .from('products')
        .update(toSupabaseProduct(patch))
        .eq('id', productId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return fromSupabaseProduct(data);
    }
    return localFetch(`/api/products/${encodeURIComponent(productId)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  async deleteProduct(productId) {
    if (IS_CLOUD_SUPABASE) {
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    return localFetch(`/api/products/${encodeURIComponent(productId)}`, {
      method: 'DELETE',
    });
  },

  // --- Image Upload (Saves real file to Server Uploads or Supabase Storage) ---
  async uploadImage(dataUrl) {
    if (IS_CLOUD_SUPABASE) {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const fileName = `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error } = await supabase.storage
        .from('product-images')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
      return data.publicUrl;
    }
    const res = await localFetch('/api/upload', {
      method: 'POST',
      body: JSON.stringify({ dataUrl }),
    });
    return res.url;
  },

  // --- Orders (Atomic 1-of-1 Sold Out) ---
  async getOrders() {
    if (IS_CLOUD_SUPABASE) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_ts', { ascending: false });
      if (error) throw new Error(error.message);
      return (data || []).map(fromSupabaseOrder);
    }
    return localFetch('/api/orders');
  },

  async placeOrder({ items, customerName, customerPhone, shippingAddress, customerEmail }) {
    if (IS_CLOUD_SUPABASE) {
      const { data, error } = await supabase.rpc('place_secondhand_order', {
        p_product_ids: items.map((i) => i.productId),
        p_customer_name: customerName,
        p_customer_phone: customerPhone,
        p_shipping_address: shippingAddress,
        p_customer_email: customerEmail || 'khach.mua.le@shop.vn',
      });
      if (error) throw new Error(error.message);
      return { order: data };
    }
    return localFetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ items, customerName, customerPhone, shippingAddress, customerEmail }),
    });
  },

  async updateOrderStatus(orderId, status) {
    if (IS_CLOUD_SUPABASE) {
      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return fromSupabaseOrder(data);
    }
    return localFetch(`/api/orders/${encodeURIComponent(orderId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async restockOrderItems(order) {
    if (IS_CLOUD_SUPABASE) {
      const ids = order.items.map((i) => i.productId).filter(Boolean);
      if (ids.length === 0) return { ok: true };
      const { error } = await supabase
        .from('products')
        .update({ is_sold_out: false, sold_at: null, sold_to_order_id: null })
        .in('id', ids);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    return localFetch(`/api/orders/${encodeURIComponent(order.id)}/restock`, {
      method: 'POST',
    });
  },

  // --- Realtime Subscription (Instant Sold Out sync across all tabs/phones) ---
  subscribeRealtime(onSyncEvent) {
    if (IS_CLOUD_SUPABASE) {
      const channel = supabase
        .channel('remora-2hand-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () =>
          onSyncEvent({ type: 'products_changed' })
        )
        .on('postgres_changes', { event: '*', schema: 'public', table: 'store_config' }, () =>
          onSyncEvent({ type: 'config_updated' })
        )
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () =>
          onSyncEvent({ type: 'orders_changed' })
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }

    if (IS_LOCALHOST) {
      const es = new EventSource('/api/events');
      es.onmessage = (ev) => {
        try {
          const parsed = JSON.parse(ev.data);
          if (parsed.type !== 'connected') {
            onSyncEvent(parsed);
          }
        } catch {}
      };
      return () => es.close();
    }

    // On serverless Netlify Cloud, poll cleanly every 8 seconds while tab is visible
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      onSyncEvent({ type: 'products_changed' });
    }, 8000);
    return () => clearInterval(timer);
  },
};
