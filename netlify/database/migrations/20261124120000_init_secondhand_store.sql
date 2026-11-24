-- Initial PostgreSQL schema for Second-Hand 1-of-1 Store on Netlify Database

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
