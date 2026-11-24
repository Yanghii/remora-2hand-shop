-- =====================================================================
-- RE:MORA SECOND-HAND (1-OF-1) — SUPABASE FREE TIER (0Đ/THÁNG) SCHEMA
-- Dán toàn bộ tệp này vào Supabase Dashboard -> SQL Editor -> Run
-- =====================================================================

-- 1. Bảng cấu hình cửa hàng (Chỉnh sửa tên cửa hàng từ trang Admin)
CREATE TABLE IF NOT EXISTS public.store_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bảng hồ sơ phân quyền (Liên kết Supabase Auth users -> role: 'customer' | 'admin')
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  phone TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tự động tạo profile 'customer' khi có khách đăng ký mới
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'customer'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Helper kiểm tra quyền Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Bảng sản phẩm Second-Hand độc bản (1-of-1)
CREATE TABLE IF NOT EXISTS public.products (
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
  is_new BOOLEAN DEFAULT TRUE,
  is_published BOOLEAN DEFAULT TRUE,
  is_sold_out BOOLEAN DEFAULT FALSE,
  sold_at TEXT,
  sold_to_order_id TEXT,
  size_guide_type TEXT DEFAULT 'men-top',
  size TEXT NOT NULL,
  fit_suggestion TEXT DEFAULT '',
  measurements JSONB DEFAULT '{}'::jsonb,
  color_key TEXT DEFAULT 'be',
  color_name TEXT DEFAULT 'Be / Kem',
  color_hex TEXT DEFAULT '#D4C3AA',
  image TEXT NOT NULL,
  material TEXT DEFAULT '',
  care_instructions JSONB DEFAULT '[]'::jsonb,
  description TEXT DEFAULT '',
  highlights JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bảng đơn hàng
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  customer_email TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT DEFAULT '',
  shipping_address TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  total INTEGER NOT NULL,
  items JSONB NOT NULL,
  created_at TEXT NOT NULL,
  created_ts TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Hàm đặt mua nguyên tử (Atomic 1-of-1 Sold Out với khóa hàng FOR UPDATE)
-- Ngăn tuyệt đối 2 khách đặt trùng cùng 1 chiếc đồ 2hand!
CREATE OR REPLACE FUNCTION public.place_secondhand_order(
  p_product_ids TEXT[],
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_shipping_address TEXT,
  p_customer_email TEXT DEFAULT 'khach.mua.le@shop.vn'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id TEXT;
  v_now_str TEXT;
  v_subtotal INTEGER := 0;
  v_free_ship INTEGER := 499000;
  v_total INTEGER;
  v_items JSONB := '[]'::jsonb;
  v_prod RECORD;
  v_cfg JSONB;
BEGIN
  IF array_length(p_product_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Giỏ hàng trống';
  END IF;

  v_order_id := '2H-' || floor(100000 + random() * 900000)::text;
  v_now_str := to_char(NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI');

  -- Khóa từng dòng sản phẩm để kiểm tra chống đặt trùng
  FOR v_prod IN
    SELECT * FROM public.products
    WHERE id = ANY(p_product_ids) AND is_published = TRUE
    FOR UPDATE
  LOOP
    IF v_prod.is_sold_out THEN
      RAISE EXCEPTION 'Rất tiếc, "%" vừa có người nhanh tay chốt trước (SOLD OUT)!', v_prod.name;
    END IF;

    v_subtotal := v_subtotal + v_prod.price;
    v_items := v_items || jsonb_build_object(
      'productId', v_prod.id,
      'name', v_prod.name,
      'colorName', split_part(COALESCE(v_prod.color_name, ''), '(', 1),
      'size', v_prod.size,
      'quantity', 1,
      'price', v_prod.price
    );

    UPDATE public.products
    SET is_sold_out = TRUE, sold_at = v_now_str, sold_to_order_id = v_order_id
    WHERE id = v_prod.id;
  END LOOP;

  IF jsonb_array_length(v_items) <> array_length(p_product_ids, 1) THEN
    RAISE EXCEPTION 'Một số sản phẩm trong giỏ không còn tồn tại.';
  END IF;

  SELECT data INTO v_cfg FROM public.store_config WHERE id = 1;
  IF v_cfg ? 'freeShipThreshold' THEN
    v_free_ship := (v_cfg->>'freeShipThreshold')::integer;
  END IF;

  v_total := v_subtotal + CASE WHEN v_subtotal >= v_free_ship THEN 0 ELSE 30000 END;

  INSERT INTO public.orders (id, customer_email, customer_name, customer_phone, shipping_address, status, total, items, created_at)
  VALUES (v_order_id, p_customer_email, p_customer_name, p_customer_phone, p_shipping_address, 'pending', v_total, v_items, v_now_str);

  RETURN jsonb_build_object(
    'id', v_order_id,
    'customerEmail', p_customer_email,
    'customerName', p_customer_name,
    'customerPhone', p_customer_phone,
    'shippingAddress', p_shipping_address,
    'status', 'pending',
    'total', v_total,
    'items', v_items,
    'createdAt', v_now_str
  );
END;
$$;

-- 6. Bật Row Level Security (Phân quyền chặt giữa Khách & Admin ngay trên Database)
ALTER TABLE public.store_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- store_config: ai cũng đọc được, chỉ Admin được sửa
CREATE POLICY "Public read config" ON public.store_config FOR SELECT USING (true);
CREATE POLICY "Admin write config" ON public.store_config FOR ALL USING (public.is_admin());

-- profiles: tự xem profile mình hoặc Admin xem tất cả
CREATE POLICY "Read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin());

-- products: khách chỉ thấy sản phẩm is_published = true; Admin toàn quyền CRUD
CREATE POLICY "Public read published products" ON public.products FOR SELECT USING (is_published = true OR public.is_admin());
CREATE POLICY "Admin manage products" ON public.products FOR ALL USING (public.is_admin());

-- orders: khách chỉ xem đơn theo email của mình; Admin xem & cập nhật tất cả
CREATE POLICY "Read own or admin orders" ON public.orders FOR SELECT
  USING (public.is_admin() OR LOWER(customer_email) = LOWER(auth.jwt()->>'email'));
CREATE POLICY "Admin update orders" ON public.orders FOR UPDATE USING (public.is_admin());

-- 7. Bật Realtime để mọi máy tự động cập nhật SOLD OUT ngay lập tức
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_config;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- 8. Khởi tạo cấu hình mặc định
INSERT INTO public.store_config (id, data)
VALUES (1, '{
  "storeName": "RE:MORA",
  "tagline": "Curated Second-Hand · 1-of-1",
  "announcement": "Đồ 2hand tuyển chọn · Mỗi mẫu chỉ có duy nhất 1 chiếc · Đã giặt hấp khử khuẩn · Đặt mua là Sold Out ngay",
  "heroBadge": "2Hand Tuyển Chọn · Duy Nhất 1 Chiếc Mỗi Mẫu",
  "hotline": "1900 6868",
  "address": "Kho tuyển chọn 2Hand — Hà Nội & TP.HCM",
  "freeShipThreshold": 499000,
  "footerDescription": "Không gian thời trang Second-Hand & Vintage tuyển chọn kỹ lưỡng từng chiếc."
}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 9. Tạo Storage Bucket công khai cho ảnh sản phẩm 2Hand
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public view product images" ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');
CREATE POLICY "Admin upload product images" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

-- MẸO NÂNG TÀI KHOẢN CỦA BẠN LÊN QUYỀN ADMIN (sau khi đăng ký trên web):
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'email_cua_ban@gmail.com';
