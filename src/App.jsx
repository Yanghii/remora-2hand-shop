import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { SlidersHorizontal, ArrowUpDown, X, SearchX, CheckCircle2, Database } from 'lucide-react';
import {
  CATEGORIES,
  CONDITION_FILTERS,
  FILTER_COLORS,
  PRICE_RANGES,
} from './data/products';
import { DEFAULT_STORE_CONFIG } from './data/storeConfig';
import { api, BACKEND_LABEL } from './services/api';
import { formatVND, normalizeVietnamese } from './utils/format';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import FilterSidebar from './components/FilterSidebar';
import ProductCard from './components/ProductCard';
import ProductDetailView from './components/ProductDetailView';
import CartDrawer from './components/CartDrawer';
import WishlistDrawer from './components/WishlistDrawer';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import AccessDeniedView from './components/AccessDeniedView';
import AdminLoginView from './components/AdminLoginView';
import AdminDashboard from './components/AdminDashboard';
import CustomerOrdersDrawer from './components/CustomerOrdersDrawer';
import MobileBottomNav from './components/MobileBottomNav';

const DEFAULT_FILTERS = {
  category: 'all',
  subCategory: 'all',
  style: 'Tất cả',
  conditionMin: 'all',
  sizes: [],
  colors: [],
  priceRangeId: 'all',
  maxPrice: 1500000,
  hideSoldOut: false,
  onlySale: false,
  onlyNew: false,
};

function parseRouteFromHash() {
  const hash = window.location.hash || '';
  if (hash === '#admin' || hash.startsWith('#admin/')) {
    return { view: 'admin', productId: null };
  }
  if (hash.startsWith('#product/')) {
    return { view: 'product', productId: hash.replace('#product/', '') };
  }
  return { view: 'store', productId: null };
}

export default function App() {
  const catalogRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState('');

  // Database-backed state (SQLite Local Backend OR Supabase Cloud Free Tier)
  const [storeConfig, setStoreConfig] = useState(DEFAULT_STORE_CONFIG);
  const [products, setProducts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [orders, setOrders] = useState([]);

  const [route, setRoute] = useState(() => parseRouteFromHash());

  // Filters & Search
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('available-first');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Client-side Cart & Wishlist (synced against live DB Sold Out status)
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('remora_cart_v3');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [wishlistIds, setWishlistIds] = useState(() => {
    try {
      const saved = localStorage.getItem('remora_wishlist_v3');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [myOrdersOpen, setMyOrdersOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => {
      setToast((current) => (current === message ? null : current));
    }, 3200);
  }, []);

  // Refresh data helpers
  const refreshProducts = useCallback(async (userObj) => {
    const isAdmin = userObj?.role === 'admin';
    const list = await api.getProducts({ includeHidden: isAdmin });
    setProducts(list);
  }, []);

  const refreshOrders = useCallback(async (userObj) => {
    if (!userObj) {
      setOrders([]);
      return;
    }
    try {
      const list = await api.getOrders();
      setOrders(list);
    } catch {
      setOrders([]);
    }
  }, []);

  // Initial Bootstrap + Handle Google/Zalo OAuth Callback (#auth-callback?token=...)
  useEffect(() => {
    let active = true;
    async function init() {
      try {
        setLoading(true);
        setServerError('');

        // Check OAuth redirect hash from Google or Zalo
        const rawHash = window.location.hash || '';
        if (rawHash.startsWith('#auth-callback')) {
          const queryPart = rawHash.split('?')[1] || '';
          const params = new URLSearchParams(queryPart);
          const token = params.get('token');
          const provider = params.get('provider');
          if (token) {
            api.applyAuthCallbackToken(token);
            showToast(
              provider === 'zalo'
                ? 'Đăng nhập bằng Zalo thành công!'
                : 'Đăng nhập bằng Gmail (Google) thành công!'
            );
          }
          window.history.replaceState(null, '', window.location.pathname);
          setRoute({ view: 'store', productId: null });
        } else if (rawHash.startsWith('#auth-error')) {
          const queryPart = rawHash.split('?')[1] || '';
          const msg = new URLSearchParams(queryPart).get('msg');
          if (msg) showToast(msg);
          window.history.replaceState(null, '', window.location.pathname);
          setRoute({ view: 'store', productId: null });
        }

        const [cfg, user] = await Promise.all([api.getStoreConfig(), api.getCurrentUser()]);
        if (!active) return;
        setStoreConfig(cfg);
        setCurrentUser(user);
        const [prods, ords] = await Promise.all([
          api.getProducts({ includeHidden: user?.role === 'admin' }),
          user ? api.getOrders().catch(() => []) : Promise.resolve([]),
        ]);
        if (!active) return;
        setProducts(prods);
        setOrders(ords);
      } catch (err) {
        if (!active) return;
        setServerError(
          err?.message ||
            'Không thể kết nối Backend Database. Hãy chạy lệnh `npm.cmd run server` để khởi động máy chủ.'
        );
      } finally {
        if (active) setLoading(false);
      }
    }
    init();
    return () => {
      active = false;
    };
  }, []);

  // Realtime sync across ALL open tabs & devices (SSE / Supabase Realtime)
  useEffect(() => {
    const unsubscribe = api.subscribeRealtime(async (event) => {
      try {
        if (event.type === 'config_updated') {
          const cfg = await api.getStoreConfig();
          setStoreConfig(cfg);
        }
        if (event.type === 'products_changed' || event.type === 'order_created') {
          await refreshProducts(currentUser);
        }
        if (event.type === 'orders_changed' || event.type === 'order_created') {
          await refreshOrders(currentUser);
        }
      } catch {}
    });
    return unsubscribe;
  }, [currentUser, refreshProducts, refreshOrders]);

  useEffect(() => {
    document.title = `${storeConfig.storeName} — Đồ Second-Hand Tuyển Chọn | 1-of-1`;
  }, [storeConfig.storeName]);

  useEffect(() => {
    try {
      localStorage.setItem('remora_cart_v3', JSON.stringify(cartItems));
    } catch {}
  }, [cartItems]);

  useEffect(() => {
    try {
      localStorage.setItem('remora_wishlist_v3', JSON.stringify(wishlistIds));
    } catch {}
  }, [wishlistIds]);

  // Automatically remove any item from cart if it became SOLD OUT on the server
  useEffect(() => {
    if (products.length === 0) return;
    setCartItems((prev) =>
      prev.filter((ci) => {
        const prod = products.find((p) => p.id === ci.productId);
        return prod && !prod.isSoldOut && prod.isPublished !== false;
      })
    );
  }, [products]);

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseRouteFromHash());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Auth Actions (backed by server)
  const handleLogin = async (email, password) => {
    try {
      const { user } = await api.login(email, password);
      setCurrentUser(user);
      await Promise.all([refreshProducts(user), refreshOrders(user)]);
      if (user.role === 'admin') {
        window.location.hash = 'admin';
        setRoute({ view: 'admin', productId: null });
        showToast('Đăng nhập Admin thành công — Đang mở Cổng Quản Trị');
      } else {
        showToast(`Chào mừng ${user.name} quay lại ${storeConfig.storeName}!`);
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const handleRegister = async ({ name, email, password }) => {
    try {
      const { user } = await api.register({ name, email, password });
      setCurrentUser(user);
      await Promise.all([refreshProducts(user), refreshOrders(user)]);
      showToast(`Đăng ký thành công! Chào mừng ${user.name}`);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const handleSocialQuickLogin = async ({ provider, email, phone, name }) => {
    try {
      const { user } = await api.socialQuickLogin({ provider, email, phone, name });
      setCurrentUser(user);
      await Promise.all([refreshProducts(user), refreshOrders(user)]);
      showToast(
        provider === 'zalo'
          ? `Đăng nhập bằng Zalo thành công! Chào ${user.name}`
          : `Đăng nhập bằng Gmail thành công! Chào ${user.name}`
      );
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  // Dedicated Admin-only login handler (used exclusively on #admin page)
  const handleAdminLogin = async (email, password) => {
    try {
      const { user } = await api.login(email, password);
      if (user.role !== 'admin') {
        await api.logout();
        return { ok: false, error: 'Tài khoản này không có quyền Quản trị viên.' };
      }
      setCurrentUser(user);
      await Promise.all([refreshProducts(user), refreshOrders(user)]);
      window.location.hash = 'admin';
      setRoute({ view: 'admin', productId: null });
      showToast('Đăng nhập Quản trị viên thành công');
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setOrders([]);
    await refreshProducts(null);
    if (route.view === 'admin') {
      window.history.pushState(null, '', window.location.pathname);
      setRoute({ view: 'store', productId: null });
    }
    showToast('Đã đăng xuất');
  };

  // Navigation
  const navigateToStore = () => {
    if (window.location.hash) {
      window.history.pushState(null, '', window.location.pathname);
    }
    setRoute({ view: 'store', productId: null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToAdmin = () => {
    window.location.hash = 'admin';
    setRoute({ view: 'admin', productId: null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProduct = (productId) => {
    window.location.hash = `product/${productId}`;
    setRoute({ view: 'product', productId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoHome = () => {
    navigateToStore();
    setFilters(DEFAULT_FILTERS);
    setSearchQuery('');
  };

  const handleSelectCategoryNav = (catId) => {
    navigateToStore();
    setFilters((prev) => ({
      ...prev,
      category: catId,
      subCategory: 'all',
      onlySale: false,
      onlyNew: false,
    }));
    setTimeout(() => {
      catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleToggleSaleNav = () => {
    navigateToStore();
    setFilters((prev) => ({ ...DEFAULT_FILTERS, hideSoldOut: true, onlySale: !prev.onlySale }));
    setTimeout(() => {
      catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleToggleNewNav = () => {
    navigateToStore();
    setFilters((prev) => ({ ...DEFAULT_FILTERS, onlyNew: !prev.onlyNew }));
    setTimeout(() => {
      catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  // Admin Store Config & CRUD (persisted to Database!)
  const handleSaveStoreConfig = async (cfg) => {
    try {
      const saved = await api.saveStoreConfig(cfg);
      setStoreConfig(saved);
      showToast(`Đã lưu tên cửa hàng "${saved.storeName}" lên Database`);
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleAddProduct = async (newProd) => {
    try {
      const created = await api.createProduct(newProd);
      setProducts((prev) => [created, ...prev]);
      showToast(`Đã đăng bán "${created.name}" lên Database!`);
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleUpdateProduct = async (productId, patch) => {
    try {
      const updated = await api.updateProduct(productId, patch);
      setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
      showToast('Đã cập nhật sản phẩm trong Database');
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      await api.deleteProduct(productId);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      showToast('Đã xóa sản phẩm khỏi Database');
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleTogglePublishProduct = async (productId) => {
    const target = products.find((p) => p.id === productId);
    if (!target) return;
    await handleUpdateProduct(productId, { isPublished: target.isPublished === false });
  };

  const handleToggleSoldOutProduct = async (productId) => {
    const target = products.find((p) => p.id === productId);
    if (!target) return;
    const nextSold = !target.isSoldOut;
    try {
      const updated = await api.updateProduct(productId, { isSoldOut: nextSold });
      setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
      showToast(
        nextSold
          ? `Đã chuyển "${target.name}" sang SOLD OUT`
          : `Đã mở bán lại "${target.name}" (Còn 1 chiếc)`
      );
    } catch (err) {
      showToast(err.message);
    }
  };

  // 1-of-1 Cart Actions
  const handleAddToCart = (product) => {
    if (product.isSoldOut) {
      showToast('Rất tiếc, sản phẩm này đã SOLD OUT!');
      return false;
    }
    const alreadyInCart = cartItems.some((i) => i.productId === product.id);
    if (alreadyInCart) {
      showToast('Món đồ 1-of-1 này đã có trong giỏ hàng của bạn');
      return true;
    }
    setCartItems((prev) => [
      ...prev,
      {
        productId: product.id,
        name: product.name,
        price: product.price,
        colorName: (product.colorName || '').split('(')[0].trim(),
        size: product.size,
        quantity: 1,
        image: product.image,
      },
    ]);
    showToast(`Đã thêm "${product.name}" (Size ${product.size}) vào giỏ`);
    return true;
  };

  const handleBuyNow = (product) => {
    const added = handleAddToCart(product);
    if (added) setCartOpen(true);
  };

  const handleRemoveCartItem = (productId) => {
    setCartItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  // ATOMIC SERVER-SIDE CHECKOUT -> AUTOMATICALLY MARKS SOLD OUT IN DB!
  const handleCreateOrder = async ({ items, customerName, customerPhone, shippingAddress }) => {
    try {
      const { order } = await api.placeOrder({
        items,
        customerName,
        customerPhone,
        shippingAddress,
        customerEmail: currentUser?.email || 'khach.mua.le@shop.vn',
      });
      await Promise.all([refreshProducts(currentUser), refreshOrders(currentUser)]);
      setCartItems([]);
      showToast(`Chốt đơn ${order.id} thành công! Đã khóa SOLD OUT trên Database.`);
      return { ok: true, orderId: order.id };
    } catch (err) {
      await refreshProducts(currentUser);
      return { ok: false, error: err.message };
    }
  };

  const handleUpdateOrderStatus = async (orderId, nextStatus) => {
    try {
      const updated = await api.updateOrderStatus(orderId, nextStatus);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      showToast(`Đã cập nhật trạng thái đơn ${orderId}`);
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleRestockOrderItems = async (order) => {
    try {
      await api.restockOrderItems(order);
      await refreshProducts(currentUser);
      showToast(`Đã gỡ SOLD OUT và mở bán lại các món từ đơn ${order.id}`);
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleToggleWishlist = (productId) => {
    setWishlistIds((prev) => {
      const exists = prev.includes(productId);
      showToast(exists ? 'Đã bỏ khỏi yêu thích' : 'Đã lưu vào yêu thích');
      return exists ? prev.filter((id) => id !== productId) : [...prev, productId];
    });
  };

  // Publicly visible products on Storefront
  const publicProducts = useMemo(
    () => products.filter((p) => p.isPublished !== false),
    [products]
  );

  const availableCount = useMemo(
    () => publicProducts.filter((p) => !p.isSoldOut).length,
    [publicProducts]
  );
  const soldOutCount = useMemo(
    () => publicProducts.filter((p) => p.isSoldOut).length,
    [publicProducts]
  );

  const updateFilters = (patch) => setFilters((prev) => ({ ...prev, ...patch }));
  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchQuery('');
  };

  const availableSubCategories = useMemo(() => {
    const scoped =
      filters.category === 'all'
        ? publicProducts
        : publicProducts.filter((p) => p.category === filters.category);
    return Array.from(new Set(scoped.map((p) => p.subCategory)));
  }, [filters.category, publicProducts]);

  const filteredProducts = useMemo(() => {
    const q = normalizeVietnamese(searchQuery);
    const activePricePreset = PRICE_RANGES.find((r) => r.id === filters.priceRangeId);
    const condObj = CONDITION_FILTERS.find((c) => c.id === filters.conditionMin);

    const list = publicProducts.filter((p) => {
      if (filters.hideSoldOut && p.isSoldOut) return false;
      if (filters.category !== 'all' && p.category !== filters.category) return false;
      if (filters.subCategory !== 'all' && p.subCategory !== filters.subCategory) return false;
      if (filters.style !== 'Tất cả' && p.style !== filters.style) return false;
      if (filters.onlySale && !p.originalPrice) return false;
      if (filters.onlyNew && !p.isNew) return false;

      if (condObj?.min && (p.conditionScore || 0) < condObj.min) return false;
      if (filters.sizes.length > 0 && !filters.sizes.includes(p.size)) return false;
      if (filters.colors.length > 0 && !filters.colors.includes(p.colorKey)) return false;

      if (filters.priceRangeId === 'custom') {
        if (p.price > filters.maxPrice) return false;
      } else if (activePricePreset && activePricePreset.id !== 'all') {
        if (p.price < activePricePreset.min || p.price > activePricePreset.max) return false;
      }

      if (q) {
        const haystack = [
          p.name,
          p.sku,
          p.originBrand,
          p.categoryLabel,
          p.subCategory,
          p.style,
          p.colorName,
          p.size,
        ]
          .map(normalizeVietnamese)
          .join(' ');
        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    const sorted = [...list];
    switch (sortBy) {
      case 'condition-desc':
        sorted.sort(
          (a, b) =>
            Number(Boolean(a.isSoldOut)) - Number(Boolean(b.isSoldOut)) ||
            (b.conditionScore || 0) - (a.conditionScore || 0)
        );
        break;
      case 'price-asc':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.price - a.price);
        break;
      default:
        sorted.sort(
          (a, b) =>
            Number(Boolean(a.isSoldOut)) - Number(Boolean(b.isSoldOut)) ||
            Number(Boolean(b.isNew)) - Number(Boolean(a.isNew))
        );
    }
    return sorted;
  }, [filters, searchQuery, sortBy, publicProducts]);

  const activeChips = useMemo(() => {
    const chips = [];
    if (filters.hideSoldOut) {
      chips.push({
        key: 'hideSoldOut',
        label: 'Chỉ hiện đồ còn hàng',
        onRemove: () => updateFilters({ hideSoldOut: false }),
      });
    }
    if (filters.category !== 'all') {
      const cat = CATEGORIES.find((c) => c.id === filters.category);
      chips.push({
        key: 'category',
        label: cat?.label,
        onRemove: () => updateFilters({ category: 'all', subCategory: 'all' }),
      });
    }
    if (filters.conditionMin !== 'all') {
      const cond = CONDITION_FILTERS.find((c) => c.id === filters.conditionMin);
      chips.push({
        key: 'cond',
        label: `Độ mới: ${cond?.label}`,
        onRemove: () => updateFilters({ conditionMin: 'all' }),
      });
    }
    if (filters.subCategory !== 'all') {
      chips.push({
        key: 'sub',
        label: filters.subCategory,
        onRemove: () => updateFilters({ subCategory: 'all' }),
      });
    }
    if (filters.style !== 'Tất cả') {
      chips.push({
        key: 'style',
        label: `Phong cách: ${filters.style}`,
        onRemove: () => updateFilters({ style: 'Tất cả' }),
      });
    }
    filters.sizes.forEach((s) => {
      chips.push({
        key: `size-${s}`,
        label: `Size ${s}`,
        onRemove: () => updateFilters({ sizes: filters.sizes.filter((x) => x !== s) }),
      });
    });
    filters.colors.forEach((cKey) => {
      const color = FILTER_COLORS.find((c) => c.key === cKey);
      chips.push({
        key: `color-${cKey}`,
        label: `Màu: ${color?.label || cKey}`,
        onRemove: () => updateFilters({ colors: filters.colors.filter((x) => x !== cKey) }),
      });
    });
    if (filters.priceRangeId === 'custom') {
      chips.push({
        key: 'price',
        label: `Dưới ${formatVND(filters.maxPrice)}`,
        onRemove: () => updateFilters({ priceRangeId: 'all', maxPrice: 1500000 }),
      });
    } else if (filters.priceRangeId !== 'all') {
      const pr = PRICE_RANGES.find((r) => r.id === filters.priceRangeId);
      chips.push({
        key: 'price',
        label: pr?.label,
        onRemove: () => updateFilters({ priceRangeId: 'all', maxPrice: 1500000 }),
      });
    }
    if (filters.onlyNew) {
      chips.push({
        key: 'new',
        label: 'Mới lên kệ',
        onRemove: () => updateFilters({ onlyNew: false }),
      });
    }
    if (searchQuery.trim()) {
      chips.push({
        key: 'search',
        label: `Tìm: "${searchQuery.trim()}"`,
        onRemove: () => setSearchQuery(''),
      });
    }
    return chips;
  }, [filters, searchQuery]);

  // Initial Loading / Connection Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 text-center space-y-3">
        <div className="w-10 h-10 rounded-full border-2 border-[#171614] border-t-transparent animate-spin" />
        <p className="font-serif text-xl text-[#171614]">Đang kết nối kho đồ 2Hand...</p>
        <p className="text-xs text-[#78716C]">{BACKEND_LABEL}</p>
      </div>
    );
  }

  if (serverError) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-6">
        <div className="max-w-md bg-white p-8 rounded-3xl border border-[#E7E4DD] text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FDF2EE] text-[#A45A3E] flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-2xl font-semibold text-[#171614]">
            Chưa kết nối được máy chủ Database
          </h2>
          <p className="text-xs text-[#57534E] leading-relaxed">{serverError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-full bg-[#171614] text-white text-xs font-semibold"
          >
            Thử kết nối lại
          </button>
        </div>
      </div>
    );
  }

  // ====== ADMIN PORTAL & DEDICATED ADMIN LOGIN (#admin) ======
  if (route.view === 'admin') {
    if (currentUser?.role === 'admin') {
      return (
        <>
          <AdminDashboard
            currentUser={currentUser}
            storeConfig={storeConfig}
            onSaveStoreConfig={handleSaveStoreConfig}
            products={products}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onTogglePublishProduct={handleTogglePublishProduct}
            onToggleSoldOutProduct={handleToggleSoldOutProduct}
            orders={orders}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onRestockOrderItems={handleRestockOrderItems}
            onViewStorefront={navigateToStore}
            onLogout={handleLogout}
          />
          {toast && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-full bg-[#171614] text-[#FAF9F6] text-xs font-medium shadow-xl border border-white/10">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toast}</span>
            </div>
          )}
        </>
      );
    }

    if (!currentUser) {
      return (
        <AdminLoginView
          storeName={storeConfig.storeName}
          onAdminLogin={handleAdminLogin}
          onBackToStore={navigateToStore}
        />
      );
    }

    return (
      <AccessDeniedView
        currentUser={currentUser}
        storeName={storeConfig.storeName}
        onGoHome={navigateToStore}
        onLogoutToAdmin={async () => {
          await api.logout();
          setCurrentUser(null);
          setOrders([]);
        }}
      />
    );
  }

  const activeProduct =
    route.view === 'product' && route.productId
      ? publicProducts.find((p) => p.id === route.productId)
      : null;

  const cartProductIds = cartItems.map((i) => i.productId);
  const wishlistedProducts = publicProducts.filter((p) => wishlistIds.includes(p.id));

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#171614]">
      <Navbar
        storeConfig={storeConfig}
        currentUser={currentUser}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenAdmin={navigateToAdmin}
        onOpenMyOrders={() => setMyOrdersOpen(true)}
        activeCategory={filters.category}
        onSelectCategory={handleSelectCategoryNav}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          if (route.view !== 'store' && q.trim()) {
            navigateToStore();
          }
        }}
        products={publicProducts}
        onSelectProduct={handleSelectProduct}
        cartCount={cartItems.length}
        wishlistCount={wishlistedProducts.length}
        onOpenCart={() => setCartOpen(true)}
        onOpenWishlist={() => setWishlistOpen(true)}
        onGoHome={handleGoHome}
        onlySale={filters.onlySale}
        onToggleSaleNav={handleToggleSaleNav}
        onlyNew={filters.onlyNew}
        onToggleNewNav={handleToggleNewNav}
      />

      <main className="flex-1">
        {activeProduct ? (
          <ProductDetailView
            storeName={storeConfig.storeName}
            product={activeProduct}
            allProducts={publicProducts}
            cartProductIds={cartProductIds}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            onBack={navigateToStore}
            onSelectCategory={handleSelectCategoryNav}
            onSelectProduct={handleSelectProduct}
          />
        ) : (
          <>
            <HeroSection
              storeConfig={storeConfig}
              availableCount={availableCount}
              soldCount={soldOutCount}
              onExploreCatalog={() =>
                catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              onSelectCategory={handleSelectCategoryNav}
            />

            <section
              ref={catalogRef}
              className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-2 sm:pt-6 pb-8 scroll-mt-36 lg:scroll-mt-24"
            >
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-[#E7E4DD]">
                <div>
                  <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.16em] text-[#A45A3E]">
                    Kho hàng 1-of-1 · Mua là Sold Out ngay
                  </p>
                  <h2 className="font-serif text-2xl sm:text-4xl font-semibold text-[#171614] mt-0.5 sm:mt-1">
                    {filters.onlyNew
                      ? 'Mới lên kệ hôm nay'
                      : CATEGORIES.find((c) => c.id === filters.category)?.countLabel ||
                        'Kho đồ 2Hand tuyển chọn'}
                  </h2>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setMobileFilterOpen(true)}
                    className="lg:hidden inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-[#D6D3CD] text-xs font-semibold text-[#171614] active:scale-95"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Bộ lọc
                    {activeChips.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-[#171614] text-white text-[10px]">
                        {activeChips.length}
                      </span>
                    )}
                  </button>

                  <span className="hidden sm:inline text-xs text-[#78716C]">
                    Còn <strong className="text-emerald-700">{availableCount}</strong> món · Đã bán{' '}
                    <strong className="text-[#171614]">{soldOutCount}</strong>
                  </span>

                  <div className="relative inline-flex items-center">
                    <ArrowUpDown className="w-3.5 h-3.5 text-[#78716C] absolute left-3 pointer-events-none" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="pl-8 pr-6 py-2 sm:py-2.5 rounded-full bg-white border border-[#E7E4DD] text-xs font-medium text-[#171614] outline-none focus:border-[#171614] cursor-pointer"
                    >
                      <option value="available-first">Còn hàng trước</option>
                      <option value="condition-desc">Độ mới cao nhất</option>
                      <option value="price-asc">Giá thấp → cao</option>
                      <option value="price-desc">Giá cao → thấp</option>
                    </select>
                  </div>
                </div>
              </div>

              {activeChips.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 py-4">
                  <span className="text-xs text-[#78716C] mr-1">Đang lọc:</span>
                  {activeChips.map((chip) => (
                    <span
                      key={chip.key}
                      className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full bg-[#EFECE6] text-xs font-medium text-[#171614]"
                    >
                      {chip.label}
                      <button
                        type="button"
                        onClick={chip.onRemove}
                        className="p-0.5 rounded-full hover:bg-black/10"
                        aria-label={`Bỏ lọc ${chip.label}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-xs font-semibold text-[#A45A3E] hover:underline ml-1"
                  >
                    Xóa tất cả
                  </button>
                </div>
              )}

              <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <aside className="hidden lg:block lg:col-span-3 sticky top-28 bg-white/80 backdrop-blur-xs p-5 rounded-3xl border border-[#ECE9E2]">
                  <FilterSidebar
                    filters={filters}
                    onChangeFilters={updateFilters}
                    onResetFilters={resetFilters}
                    availableSubCategories={availableSubCategories}
                    activeFilterCount={activeChips.length}
                  />
                </aside>

                <div className="lg:col-span-9">
                  {filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
                      {filteredProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          isWishlisted={wishlistIds.includes(product.id)}
                          isInCart={cartProductIds.includes(product.id)}
                          onToggleWishlist={handleToggleWishlist}
                          onSelectProduct={handleSelectProduct}
                          onQuickAdd={handleAddToCart}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="py-20 px-6 rounded-3xl bg-white border border-[#ECE9E2] text-center space-y-4">
                      <div className="w-14 h-14 mx-auto rounded-full bg-[#F2F0EC] flex items-center justify-center text-[#8C857D]">
                        <SearchX className="w-7 h-7" />
                      </div>
                      <h3 className="font-serif text-2xl font-semibold text-[#171614]">
                        Không tìm thấy món 2Hand phù hợp
                      </h3>
                      <p className="text-sm text-[#78716C] max-w-md mx-auto">
                        Thử tắt bớt bộ lọc size, độ mới hoặc khoảng giá để xem thêm các món độc bản khác từ {storeConfig.storeName}.
                      </p>
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="px-6 py-2.5 rounded-full bg-[#171614] text-white text-xs font-semibold hover:bg-[#2E2C29]"
                      >
                        Xem tất cả kho đồ
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <div className="pb-16 lg:pb-0">
        <Footer
          storeConfig={storeConfig}
          onSelectCategory={handleSelectCategoryNav}
        />
      </div>

      {/* Native-style Mobile Bottom Navigation (hidden on Product Detail where sticky Buy bar shows) */}
      {!activeProduct && (
        <MobileBottomNav
          activeView={route.view}
          filterCount={activeChips.length}
          wishlistCount={wishlistedProducts.length}
          cartCount={cartItems.length}
          currentUser={currentUser}
          onGoHome={handleGoHome}
          onOpenFilter={() => setMobileFilterOpen(true)}
          onOpenWishlist={() => setWishlistOpen(true)}
          onOpenCart={() => setCartOpen(true)}
          onOpenAccount={() => (currentUser ? setMyOrdersOpen(true) : setAuthModalOpen(true))}
        />
      )}

      {/* Mobile Filter Bottom Sheet */}
      {mobileFilterOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex items-end bg-black/50 backdrop-blur-xs"
          onClick={() => setMobileFilterOpen(false)}
        >
          <div
            className="w-full bg-[#FAF9F6] rounded-t-3xl max-h-[86vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle pill */}
            <div className="pt-3 pb-1 flex justify-center bg-[#FAF9F6]">
              <span className="w-10 h-1.5 rounded-full bg-[#D6D3CD]" />
            </div>

            <div className="flex-1 overflow-y-auto px-5 pt-2 pb-4">
              <FilterSidebar
                filters={filters}
                onChangeFilters={updateFilters}
                onResetFilters={resetFilters}
                availableSubCategories={availableSubCategories}
                activeFilterCount={activeChips.length}
                isMobileDrawer
                onCloseMobile={() => setMobileFilterOpen(false)}
              />
            </div>

            <div className="p-4 pb-safe bg-white border-t border-[#E7E4DD]">
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="w-full py-3.5 rounded-full bg-[#171614] text-white text-sm font-semibold active:scale-[0.98]"
              >
                Áp dụng · Xem {filteredProducts.length} sản phẩm
              </button>
            </div>
          </div>
        </div>
      )}

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        storeName={storeConfig.storeName}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onSocialQuickLogin={handleSocialQuickLogin}
      />

      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        storeConfig={storeConfig}
        currentUser={currentUser}
        items={cartItems}
        onRemoveItem={handleRemoveCartItem}
        onCreateOrder={handleCreateOrder}
      />

      <WishlistDrawer
        isOpen={wishlistOpen}
        onClose={() => setWishlistOpen(false)}
        products={wishlistedProducts}
        onRemoveWishlist={handleToggleWishlist}
        onSelectProduct={handleSelectProduct}
      />

      <CustomerOrdersDrawer
        isOpen={myOrdersOpen}
        onClose={() => setMyOrdersOpen(false)}
        currentUser={currentUser}
        orders={orders}
      />

      {toast && (
        <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-sm sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-5 py-3 rounded-full bg-[#171614] text-[#FAF9F6] text-xs font-medium shadow-xl border border-white/10">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">{toast}</span>
        </div>
      )}
    </div>
  );
}
