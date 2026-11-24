import React, { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Settings,
  Store,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Check,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  Clock,
  Tag,
  X,
  Upload,
  RefreshCw,
} from 'lucide-react';
import { formatVND, compressImageFile } from '../utils/format';
import { ORDER_STATUS_META, DEFAULT_STORE_CONFIG } from '../data/storeConfig';
import { FILTER_COLORS, ALL_SIZES } from '../data/products';
import { api, BACKEND_LABEL } from '../services/api';

const PRESET_IMAGES = [
  { label: 'Áo khoác Nam', url: '/images/men-jacket.jpg' },
  { label: 'Sơ mi Linen Nam', url: '/images/men-shirt.jpg' },
  { label: 'Quần âu Nam', url: '/images/men-trousers.jpg' },
  { label: 'Áo Polo Nam', url: '/images/men-polo.jpg' },
  { label: 'Blazer Nữ', url: '/images/women-blazer.jpg' },
  { label: 'Đầm Midi Nữ', url: '/images/women-dress.jpg' },
  { label: 'Cardigan Nữ', url: '/images/women-cardigan.jpg' },
  { label: 'Áo Lụa Nữ', url: '/images/women-blouse.jpg' },
  { label: 'Túi da Cognac', url: '/images/acc-bag.jpg' },
  { label: 'Mũ Washed', url: '/images/acc-cap.jpg' },
  { label: 'Kính Acetate', url: '/images/acc-sunglasses.jpg' },
  { label: 'Khăn Lụa', url: '/images/acc-scarf.jpg' },
];

const EMPTY_PRODUCT_FORM = {
  name: '',
  category: 'nam',
  subCategory: 'Áo khoác',
  style: 'Vintage',
  originBrand: 'Tuyển kiện Nhật · 2Hand',
  conditionScore: 96,
  conditionNote: 'Đã giặt hấp khử khuẩn, không rách hay ố màu, tình trạng rất đẹp.',
  size: 'L',
  fitSuggestion: 'Phù hợp 1m68 – 1m76 · 62 – 72kg',
  measurementText: 'Rộng vai: 46cm | Vòng ngực: 108cm | Dài áo: 70cm',
  colorKey: 'be',
  colorName: 'Be / Kem',
  price: 350000,
  originalPrice: 1100000,
  image: '/images/men-jacket.jpg',
  description: '',
  isNew: true,
};

function parseMeasurementsString(text) {
  const result = {};
  if (!text || !text.trim()) return result;
  text.split('|').forEach((part) => {
    const [k, v] = part.split(':');
    if (k && v && k.trim() && v.trim()) {
      result[k.trim()] = v.trim();
    }
  });
  return result;
}

function stringifyMeasurements(obj) {
  if (!obj) return '';
  return Object.entries(obj)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' | ');
}

export default function AdminDashboard({
  currentUser,
  storeConfig,
  onSaveStoreConfig,
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onTogglePublishProduct,
  onToggleSoldOutProduct,
  orders,
  onUpdateOrderStatus,
  onRestockOrderItems,
  onViewStorefront,
  onLogout,
}) {
  const [activeTab, setActiveTab] = useState('products'); // Default straight to Products so owner can upload fast!
  const [settingsForm, setSettingsForm] = useState(storeConfig);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Admin password change state
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwMsg, setPwMsg] = useState({ type: '', text: '' });
  const [pwSaving, setPwSaving] = useState(false);

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT_FORM);
  const [uploadingImg, setUploadingImg] = useState(false);

  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total, 0);
  const pendingOrdersCount = orders.filter((o) => o.status === 'pending').length;
  const availableCount = products.filter((p) => !p.isSoldOut && p.isPublished !== false).length;
  const soldOutCount = products.filter((p) => p.isSoldOut).length;

  const openCreateModal = () => {
    setEditingProduct(null);
    setProductForm(EMPTY_PRODUCT_FORM);
    setProductModalOpen(true);
  };

  const openEditModal = (prod) => {
    setEditingProduct(prod);
    setProductForm({
      name: prod.name,
      category: prod.category,
      subCategory: prod.subCategory,
      style: prod.style,
      originBrand: prod.originBrand || '',
      conditionScore: prod.conditionScore || 95,
      conditionNote: prod.conditionNote || '',
      size: prod.size || 'M',
      fitSuggestion: prod.fitSuggestion || '',
      measurementText: stringifyMeasurements(prod.measurements),
      colorKey: prod.colorKey || 'be',
      colorName: prod.colorName || 'Be / Kem',
      price: prod.price,
      originalPrice: prod.originalPrice || '',
      image: prod.image || '/images/men-jacket.jpg',
      description: prod.description || '',
      isNew: Boolean(prod.isNew),
    });
    setProductModalOpen(true);
  };

  const handleImageFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImg(true);
      const dataUrl = await compressImageFile(file, 900, 0.82);
      const uploadedUrl = await api.uploadImage(dataUrl);
      setProductForm((prev) => ({ ...prev, image: uploadedUrl }));
    } catch (err) {
      alert(err?.message || 'Không thể tải ảnh lên máy chủ. Vui lòng thử lại.');
    } finally {
      setUploadingImg(false);
    }
  };

  const handleSubmitProduct = (e) => {
    e.preventDefault();
    if (!productForm.name.trim()) return;

    const categoryLabel =
      productForm.category === 'nam'
        ? 'Nam'
        : productForm.category === 'nu'
          ? 'Nữ'
          : 'Phụ kiện';

    const priceNum = Number(productForm.price) || 0;
    const origNum = productForm.originalPrice ? Number(productForm.originalPrice) : null;
    const condScore = Number(productForm.conditionScore) || 95;
    const condLabel =
      condScore >= 98
        ? `${condScore}% · Như mới (Like New)`
        : condScore >= 95
          ? `${condScore}% · Rất đẹp`
          : `${condScore}% · Đẹp chuẩn Vintage`;

    const colorObj = FILTER_COLORS.find((c) => c.key === productForm.colorKey) || FILTER_COLORS[0];
    const measurements = parseMeasurementsString(productForm.measurementText);

    const payload = {
      name: productForm.name.trim(),
      category: productForm.category,
      categoryLabel,
      subCategory: productForm.subCategory.trim() || 'Đồ 2Hand',
      style: productForm.style,
      originBrand: productForm.originBrand.trim() || 'Tuyển chọn 2Hand',
      conditionScore: condScore,
      conditionLabel: condLabel,
      conditionNote:
        productForm.conditionNote.trim() || 'Đã giặt hấp khử khuẩn sạch sẽ, sẵn sàng mặc ngay.',
      size: productForm.size,
      fitSuggestion: productForm.fitSuggestion.trim(),
      measurements,
      colorKey: colorObj.key,
      colorName: productForm.colorName.trim() || colorObj.label,
      colorHex: colorObj.hex,
      price: priceNum,
      originalPrice: origNum && origNum > priceNum ? origNum : null,
      image: productForm.image,
      isNew: productForm.isNew,
      sizeGuideType:
        productForm.category === 'phu-kien'
          ? 'accessory'
          : productForm.category === 'nu'
            ? 'women-top'
            : 'men-top',
      description:
        productForm.description.trim() ||
        `Sản phẩm second-hand tuyển chọn độc bản (1-of-1) tại ${storeConfig.storeName}. Chỉ có duy nhất 1 chiếc — đặt mua là Sold Out ngay.`,
    };

    if (editingProduct) {
      onUpdateProduct(editingProduct.id, payload);
    } else {
      onAddProduct({
        ...payload,
        id: `2h-${Date.now()}`,
        sku: `2H-${Math.floor(100 + Math.random() * 900)}`,
        isPublished: true,
        isSoldOut: false,
        material: 'Chất liệu tuyển chọn kiện 2Hand, đã kiểm tra đường may & giặt hấp.',
        careInstructions: ['Đã giặt hấp khử khuẩn sẵn sàng mặc ngay.', 'Giặt nhẹ nước lạnh.'],
        highlights: [
          'Hàng second-hand tuyển chọn duy nhất 1 chiếc (1-of-1)',
          `Độ mới thực tế ${condScore}%`,
          'Tự động Sold Out ngay khi có khách chốt đơn',
        ],
      });
    }

    setProductModalOpen(false);
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    const cleaned = {
      ...settingsForm,
      storeName: settingsForm.storeName.trim() || DEFAULT_STORE_CONFIG.storeName,
      freeShipThreshold: Number(settingsForm.freeShipThreshold) || 0,
    };
    onSaveStoreConfig(cleaned);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  const handleResetSettings = () => {
    setSettingsForm(DEFAULT_STORE_CONFIG);
    onSaveStoreConfig(DEFAULT_STORE_CONFIG);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  const handleChangeAdminPassword = async (e) => {
    e.preventDefault();
    setPwMsg({ type: '', text: '' });
    if (pwForm.newPassword.length < 6) {
      setPwMsg({ type: 'error', text: 'Mật khẩu mới cần tối thiểu 6 ký tự.' });
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' });
      return;
    }
    try {
      setPwSaving(true);
      await api.changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPwMsg({ type: 'ok', text: 'Đổi mật khẩu Admin thành công! Hãy dùng mật khẩu mới cho lần đăng nhập tới.' });
    } catch (err) {
      setPwMsg({ type: 'error', text: err.message });
    } finally {
      setPwSaving(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Tổng quan & Phân quyền', icon: LayoutDashboard },
    { id: 'products', label: `Kho 2Hand (${products.length})`, icon: Package },
    { id: 'orders', label: `Đơn hàng (${orders.length})`, icon: ShoppingCart },
    { id: 'settings', label: 'Tên & Cài đặt shop', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F5F4F0] text-[#171614] flex flex-col lg:flex-row">
      {/* Compact Mobile Admin Top Bar + Horizontal Tab Strip */}
      <div className="lg:hidden sticky top-0 z-30 bg-[#171614] text-[#FAF9F6] shadow-md">
        <div className="px-4 py-3 flex items-center justify-between gap-2 border-b border-white/10">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-[#A45A3E] text-[9px] font-bold uppercase tracking-wider">
                Admin
              </span>
              <h1 className="font-serif text-lg font-semibold tracking-wider truncate">
                {storeConfig.storeName}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#A45A3E] text-white text-[11px] font-bold active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              Up đồ
            </button>
            <button
              type="button"
              onClick={onViewStorefront}
              className="p-2 rounded-full bg-white/10 text-white"
              aria-label="Xem trang khách"
            >
              <Store className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="p-2 rounded-full bg-white/10 text-white/75"
              aria-label="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-3 py-2">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                  active ? 'bg-[#FAF9F6] text-[#171614]' : 'bg-white/10 text-white/80'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Left Admin Sidebar */}
      <aside className="hidden lg:flex lg:w-68 bg-[#171614] text-[#FAF9F6] flex-col shrink-0">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#A45A3E] text-[10px] font-bold uppercase tracking-wider">
              Admin 2Hand
            </span>
            <span className="text-xs text-white/60">Quản lý kho 1-of-1</span>
          </div>
          <h1 className="font-serif text-2xl font-semibold tracking-[0.14em] mt-2 truncate">
            {storeConfig.storeName}
          </h1>
          <p className="text-[11px] text-white/55 mt-0.5 truncate">
            {currentUser?.name || 'Chủ shop'} · {currentUser?.email}
          </p>
          <p className="mt-2 px-2.5 py-1 rounded-lg bg-white/8 text-[10px] text-emerald-300 font-medium truncate">
            ● {BACKEND_LABEL}
          </p>
        </div>

        <nav className="p-3 space-y-1 flex-1">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-[#FAF9F6] text-[#171614]'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
          <button
            type="button"
            onClick={openCreateModal}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#A45A3E] hover:bg-[#8C4930] text-xs font-semibold text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            Đăng sản phẩm 2Hand mới
          </button>
          <button
            type="button"
            onClick={onViewStorefront}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
          >
            <Store className="w-4 h-4" />
            Xem trang Khách hàng
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-white/65 hover:text-red-300 hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 p-5 sm:p-8 lg:p-10 space-y-8 overflow-y-auto">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A45A3E]">
                  Cơ chế Second-Hand 1-of-1 tự động Sold Out
                </p>
                <h2 className="font-serif text-3xl font-semibold text-[#171614] mt-1">
                  Tổng quan kho đồ {storeConfig.storeName}
                </h2>
              </div>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#171614] text-white text-xs font-semibold hover:bg-[#2E2C29] self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                Up sản phẩm 2Hand mới
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-[#E7E4DD]">
                <div className="flex items-center justify-between text-xs text-[#78716C]">
                  <span>Doanh thu tạm tính</span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-[#171614] mt-2">{formatVND(totalRevenue)}</p>
                <p className="text-[11px] text-[#78716C] mt-1">Từ {orders.length} đơn hàng</p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#E7E4DD]">
                <div className="flex items-center justify-between text-xs text-[#78716C]">
                  <span>Đơn mới chờ duyệt</span>
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-2xl font-bold text-[#171614] mt-2">{pendingOrdersCount}</p>
                <p className="text-[11px] text-[#78716C] mt-1">Sản phẩm đã tự khóa Sold Out</p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#E7E4DD]">
                <div className="flex items-center justify-between text-xs text-[#78716C]">
                  <span>Đang mở bán (Còn 1 chiếc)</span>
                  <Eye className="w-4 h-4 text-emerald-700" />
                </div>
                <p className="text-2xl font-bold text-emerald-700 mt-2">{availableCount}</p>
                <p className="text-[11px] text-[#78716C] mt-1">Khách có thể chốt đơn ngay</p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#E7E4DD]">
                <div className="flex items-center justify-between text-xs text-[#78716C]">
                  <span>Đã bán (SOLD OUT)</span>
                  <Tag className="w-4 h-4 text-[#A45A3E]" />
                </div>
                <p className="text-2xl font-bold text-[#A45A3E] mt-2">{soldOutCount}</p>
                <p className="text-[11px] text-[#78716C] mt-1">Món độc bản đã có chủ</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-[#E7E4DD] p-6 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#A45A3E]" />
                <h3 className="font-semibold text-base text-[#171614]">
                  Quy trình hoạt động & Phân quyền Khách hàng vs Chủ shop (Admin)
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#44403C]">
                <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#ECE9E2] space-y-2">
                  <p className="font-bold text-[#171614] uppercase tracking-wider">
                    Phía Khách hàng (Trang cửa hàng)
                  </p>
                  <ul className="space-y-1.5 list-disc pl-4">
                    <li>Xem toàn bộ đồ 2Hand chủ shop đã up lên, lọc theo độ mới %, size thực tế, giá và bật/tắt “Ẩn đồ đã Sold Out”.</li>
                    <li>Mỗi món chỉ có duy nhất 1 chiếc. Khi bấm <strong>Chốt đơn ngay</strong>, sản phẩm tự động chuyển sang <strong>SOLD OUT</strong> lập tức.</li>
                    <li>Không thể truy cập <code>#admin</code> (bị chặn bằng màn hình 403).</li>
                  </ul>
                </div>
                <div className="p-4 rounded-2xl bg-[#FDF7F4] border border-[#A45A3E]/25 space-y-2">
                  <p className="font-bold text-[#A45A3E] uppercase tracking-wider">
                    Phía Chủ shop (Trang Admin #admin)
                  </p>
                  <ul className="space-y-1.5 list-disc pl-4">
                    <li>Up sản phẩm 2Hand mới kèm <strong>tải ảnh trực tiếp từ máy tính</strong>, nhập độ mới %, size duy nhất & số đo tay.</li>
                    <li>Nhận thông tin đơn hàng ngay khi khách chốt; nếu khách hủy đơn có thể bấm <strong>Mở bán lại (Gỡ Sold Out)</strong> trong 1 giây.</li>
                    <li>Chỉnh sửa Tên cửa hàng, Tagline, Hotline, Thông báo đầu trang trực tiếp.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCTS (2HAND INVENTORY & UPLOAD) */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-3xl font-semibold text-[#171614]">
                  Kho sản phẩm Second-Hand (1-of-1)
                </h2>
                <p className="text-xs text-[#78716C] mt-1">
                  Up món đồ mới lên kệ — ngay khi có khách đặt mua, trạng thái tự động nhảy sang{' '}
                  <strong className="text-[#A45A3E]">SOLD OUT</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#171614] text-white text-xs font-semibold hover:bg-[#2E2C29] self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                Up sản phẩm 2Hand mới
              </button>
            </div>

            {/* Mobile Touch-Friendly 2Hand Product Cards */}
            <div className="md:hidden space-y-3">
              {products.map((prod) => {
                const isPublished = prod.isPublished !== false;
                const isSoldOut = Boolean(prod.isSoldOut);
                return (
                  <div
                    key={prod.id}
                    className="p-3.5 rounded-2xl bg-white border border-[#E7E4DD] space-y-3"
                  >
                    <div className="flex gap-3">
                      <img
                        src={prod.image}
                        alt={prod.name}
                        className={`w-16 h-20 rounded-xl object-cover object-top bg-[#F2F0EC] shrink-0 ${
                          isSoldOut ? 'grayscale opacity-70' : ''
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-[#78716C] truncate">
                          {prod.sku} · Size {prod.size} · {prod.conditionScore}%
                        </p>
                        <h4 className="text-sm font-semibold text-[#171614] line-clamp-2 leading-snug mt-0.5">
                          {prod.name}
                        </h4>
                        <p className="text-sm font-bold text-[#A45A3E] mt-1">
                          {formatVND(prod.price)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#F2F0EC]">
                      <button
                        type="button"
                        onClick={() => onToggleSoldOutProduct(prod.id)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                          isSoldOut
                            ? 'bg-[#171614] text-white border-[#171614]'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {isSoldOut ? 'SOLD OUT · Mở bán lại' : 'Còn 1 chiếc'}
                      </button>

                      <button
                        type="button"
                        onClick={() => onTogglePublishProduct(prod.id)}
                        className="p-2 rounded-xl border border-[#E7E4DD] text-[#57534E]"
                        aria-label="Ẩn/Hiện"
                      >
                        {isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(prod)}
                        className="p-2 rounded-xl border border-[#E7E4DD] text-[#171614]"
                        aria-label="Sửa"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteProduct(prod.id)}
                        className="p-2 rounded-xl border border-red-200 text-red-600"
                        aria-label="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Full Inventory Table */}
            <div className="hidden md:block bg-white rounded-3xl border border-[#E7E4DD] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FAF9F6] border-b border-[#E7E4DD] text-[#78716C] uppercase">
                      <th className="py-3.5 px-4">Sản phẩm 2Hand</th>
                      <th className="py-3.5 px-4">Size & Độ mới</th>
                      <th className="py-3.5 px-4">Giá bán</th>
                      <th className="py-3.5 px-4">Tình trạng bán (1-of-1)</th>
                      <th className="py-3.5 px-4">Hiển thị</th>
                      <th className="py-3.5 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2F0EC]">
                    {products.map((prod) => {
                      const isPublished = prod.isPublished !== false;
                      const isSoldOut = Boolean(prod.isSoldOut);
                      return (
                        <tr key={prod.id} className="hover:bg-[#FAF9F6]">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={prod.image}
                                alt={prod.name}
                                className={`w-11 h-14 rounded-lg object-cover object-top bg-[#F2F0EC] shrink-0 ${
                                  isSoldOut ? 'grayscale opacity-70' : ''
                                }`}
                              />
                              <div className="min-w-0">
                                <p className="font-semibold text-[#171614] truncate max-w-[230px]">
                                  {prod.name}
                                </p>
                                <p className="text-[11px] text-[#78716C] truncate max-w-[230px]">
                                  {prod.sku} · {prod.originBrand}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-bold text-[#171614]">Size {prod.size}</span>
                            <span className="block text-[11px] text-[#78716C]">
                              Độ mới {prod.conditionScore}%
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-semibold text-[#171614]">
                              {formatVND(prod.price)}
                            </span>
                            {prod.originalPrice && (
                              <span className="block text-[11px] text-[#A8A29E] line-through">
                                {formatVND(prod.originalPrice)}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => onToggleSoldOutProduct(prod.id)}
                              title="Bấm để chuyển đổi Còn hàng / Sold Out"
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                                isSoldOut
                                  ? 'bg-[#171614] text-white border-[#171614] hover:bg-[#333]'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              }`}
                            >
                              {isSoldOut ? 'SOLD OUT (Bấm mở bán lại)' : 'Còn 1 chiếc'}
                            </button>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => onTogglePublishProduct(prod.id)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                                isPublished
                                  ? 'bg-white text-[#171614] border-[#D6D3CD]'
                                  : 'bg-[#F2F0EC] text-[#8C857D] border-[#E7E4DD]'
                              }`}
                            >
                              {isPublished ? (
                                <>
                                  <Eye className="w-3 h-3" /> Hiện
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3 h-3" /> Đang ẩn
                                </>
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditModal(prod)}
                                className="p-2 rounded-lg hover:bg-[#EFECE6] text-[#44403C]"
                                title="Chỉnh sửa"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteProduct(prod.id)}
                                className="p-2 rounded-lg hover:bg-red-50 text-[#78716C] hover:text-red-600"
                                title="Xóa sản phẩm"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-3xl font-semibold text-[#171614]">
                Quản lý Đơn hàng 2Hand
              </h2>
              <p className="text-xs text-[#78716C] mt-1">
                Khi khách chốt đơn, sản phẩm tự động chuyển sang SOLD OUT. Nếu đơn bị hủy, bạn có thể bấm “Mở bán lại” để gỡ Sold Out ngay.
              </p>
            </div>

            <div className="space-y-4">
              {orders.map((order) => {
                const statusInfo = ORDER_STATUS_META[order.status] || ORDER_STATUS_META.pending;
                return (
                  <div
                    key={order.id}
                    className="p-5 rounded-2xl bg-white border border-[#E7E4DD] space-y-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-[#F2F0EC]">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono text-sm font-bold text-[#171614]">
                            {order.id}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusInfo.className}`}
                          >
                            {statusInfo.label}
                          </span>
                          <span className="text-[11px] text-[#78716C]">{order.createdAt}</span>
                        </div>
                        <p className="text-xs text-[#44403C]">
                          Người nhận: <strong>{order.customerName}</strong> · SĐT:{' '}
                          <strong>{order.customerPhone || '—'}</strong> ({order.customerEmail})
                        </p>
                        {order.shippingAddress && (
                          <p className="text-xs text-[#78716C]">Địa chỉ: {order.shippingAddress}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-base font-bold text-[#171614]">
                          {formatVND(order.total)}
                        </span>
                        <select
                          value={order.status}
                          onChange={(e) => onUpdateOrderStatus(order.id, e.target.value)}
                          className="px-3 py-2 rounded-xl border border-[#D6D3CD] bg-[#FAF9F6] text-xs font-semibold text-[#171614] outline-none cursor-pointer"
                        >
                          <option value="pending">Chờ xác nhận</option>
                          <option value="shipping">Đang giao hàng</option>
                          <option value="completed">Hoàn thành</option>
                          <option value="cancelled">Đã hủy</option>
                        </select>
                        {order.status === 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => onRestockOrderItems(order)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Mở bán lại (Gỡ Sold Out)
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs text-[#44403C]"
                        >
                          <span>
                            <strong>1x</strong> {item.name}{' '}
                            <span className="text-[#78716C]">
                              ({item.colorName} · Size {item.size})
                            </span>
                          </span>
                          <span className="font-medium text-[#171614]">
                            {formatVND(item.price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: STORE SETTINGS */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A45A3E]">
                Tùy chỉnh thương hiệu 2Hand
              </p>
              <h2 className="font-serif text-3xl font-semibold text-[#171614] mt-1">
                Chỉnh sửa Tên cửa hàng & Cài đặt
              </h2>
            </div>

            <div className="p-5 rounded-2xl bg-[#171614] text-[#FAF9F6] space-y-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                Xem trước Logo & Tiêu đề
              </p>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="font-serif text-3xl font-semibold tracking-[0.16em]">
                  {settingsForm.storeName || 'RE:MORA'}
                </span>
                <span className="text-xs uppercase tracking-[0.2em] text-white/60 border-l border-white/20 pl-3">
                  {settingsForm.tagline}
                </span>
              </div>
              <p className="text-xs text-[#D6B89E] pt-1">{settingsForm.announcement}</p>
            </div>

            <form
              onSubmit={handleSaveSettings}
              className="p-6 rounded-3xl bg-white border border-[#E7E4DD] space-y-5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1.5">
                    Tên cửa hàng *
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsForm.storeName}
                    onChange={(e) =>
                      setSettingsForm((s) => ({ ...s, storeName: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 text-sm font-semibold rounded-xl border border-[#D6D3CD] focus:border-[#171614] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1.5">
                    Khẩu hiệu (Tagline)
                  </label>
                  <input
                    type="text"
                    value={settingsForm.tagline}
                    onChange={(e) =>
                      setSettingsForm((s) => ({ ...s, tagline: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-[#D6D3CD] focus:border-[#171614] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#44403C] mb-1.5">
                  Thanh thông báo đầu trang
                </label>
                <input
                  type="text"
                  value={settingsForm.announcement}
                  onChange={(e) =>
                    setSettingsForm((s) => ({ ...s, announcement: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-[#D6D3CD] focus:border-[#171614] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1.5">
                    Nhãn Hero
                  </label>
                  <input
                    type="text"
                    value={settingsForm.heroBadge}
                    onChange={(e) =>
                      setSettingsForm((s) => ({ ...s, heroBadge: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-[#D6D3CD] focus:border-[#171614] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1.5">
                    Hotline
                  </label>
                  <input
                    type="text"
                    value={settingsForm.hotline}
                    onChange={(e) =>
                      setSettingsForm((s) => ({ ...s, hotline: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-[#D6D3CD] focus:border-[#171614] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1.5">
                    Freeship từ (VNĐ)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={50000}
                    value={settingsForm.freeShipThreshold}
                    onChange={(e) =>
                      setSettingsForm((s) => ({ ...s, freeShipThreshold: Number(e.target.value) }))
                    }
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-[#D6D3CD] focus:border-[#171614] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#44403C] mb-1.5">
                  Mô tả thương hiệu (Chân trang)
                </label>
                <textarea
                  rows={3}
                  value={settingsForm.footerDescription}
                  onChange={(e) =>
                    setSettingsForm((s) => ({ ...s, footerDescription: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-[#D6D3CD] focus:border-[#171614] outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#F2F0EC]">
                <button
                  type="button"
                  onClick={handleResetSettings}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-medium text-[#78716C] hover:bg-[#F2F0EC]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Khôi phục mặc định
                </button>
                <div className="flex items-center gap-3">
                  {settingsSaved && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                      <Check className="w-4 h-4" /> Đã lưu!
                    </span>
                  )}
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-full bg-[#171614] hover:bg-[#2E2C29] text-white text-xs font-semibold"
                  >
                    Lưu cài đặt cửa hàng
                  </button>
                </div>
              </div>
            </form>

            {/* Google (Gmail) & Zalo Official OAuth2 Config Reference */}
            <div className="p-6 rounded-3xl bg-white border border-[#E7E4DD] space-y-3">
              <h3 className="text-sm font-bold text-[#171614]">
                Đăng nhập khách hàng bằng Gmail (Google) & Zalo
              </h3>
              <p className="text-xs text-[#57534E] leading-relaxed">
                Hiện khách đã có thể bấm nút <strong>Tiếp tục với Gmail</strong> hoặc{' '}
                <strong>Tiếp tục với Zalo</strong> để đăng nhập nhanh ngay lập tức. Khi bạn muốn bật xác thực OAuth chính thức 1 chạm của Google / Zalo, chỉ cần thêm biến môi trường trong Netlify Dashboard (Project configuration → Environment variables):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#ECE9E2] space-y-1.5">
                  <p className="font-bold text-[#171614]">Google OAuth2 (Gmail)</p>
                  <p className="text-[#57534E]">Biến: <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code></p>
                  <p className="text-[#78716C] break-all">
                    Callback URL: <code>{window.location.origin}/api/auth/oauth/google/callback</code>
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#EEF5FF] border border-[#0068FF]/20 space-y-1.5">
                  <p className="font-bold text-[#0068FF]">Zalo OAuth v4 (PKCE)</p>
                  <p className="text-[#57534E]">Biến: <code>ZALO_APP_ID</code>, <code>ZALO_APP_SECRET</code></p>
                  <p className="text-[#78716C] break-all">
                    Callback URL: <code>{window.location.origin}/api/auth/oauth/zalo/callback</code>
                  </p>
                </div>
              </div>
            </div>

            {/* Change Admin Password */}
            <form
              onSubmit={handleChangeAdminPassword}
              className="p-6 rounded-3xl bg-white border border-[#E7E4DD] space-y-4"
            >
              <div>
                <h3 className="text-sm font-bold text-[#171614]">Đổi mật khẩu tài khoản Admin</h3>
                <p className="text-xs text-[#78716C] mt-0.5">
                  Nên đổi mật khẩu mặc định ngay để bảo vệ tuyệt đối cổng quản trị <code>/#admin</code>.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="password"
                  required
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
                  placeholder="Mật khẩu hiện tại *"
                  className="px-3.5 py-2.5 text-xs rounded-xl border border-[#D6D3CD] focus:border-[#171614] outline-none"
                />
                <input
                  type="password"
                  required
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                  placeholder="Mật khẩu mới (>= 6 ký tự) *"
                  className="px-3.5 py-2.5 text-xs rounded-xl border border-[#D6D3CD] focus:border-[#171614] outline-none"
                />
                <input
                  type="password"
                  required
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                  placeholder="Nhập lại mật khẩu mới *"
                  className="px-3.5 py-2.5 text-xs rounded-xl border border-[#D6D3CD] focus:border-[#171614] outline-none"
                />
              </div>
              {pwMsg.text && (
                <p
                  className={`text-xs font-medium ${
                    pwMsg.type === 'ok' ? 'text-emerald-700' : 'text-red-600'
                  }`}
                >
                  {pwMsg.text}
                </p>
              )}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={pwSaving}
                  className="px-5 py-2.5 rounded-full bg-[#A45A3E] hover:bg-[#8C4930] text-white text-xs font-semibold disabled:opacity-60"
                >
                  {pwSaving ? 'Đang cập nhật...' : 'Cập nhật mật khẩu Admin'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Add / Edit 2Hand Product Modal with Local Photo Upload */}
      {productModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setProductModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-[#FAF9F6] rounded-3xl shadow-2xl border border-[#E7E4DD] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-white border-b border-[#E7E4DD] flex items-center justify-between">
              <div>
                <h3 className="font-serif text-2xl font-semibold text-[#171614]">
                  {editingProduct ? 'Chỉnh sửa món đồ 2Hand' : 'Đăng bán sản phẩm 2Hand mới (1-of-1)'}
                </h3>
                <p className="text-[11px] text-[#78716C]">
                  Mỗi món lên kệ là duy nhất 1 chiếc — sẽ tự động Sold Out ngay khi có khách đặt mua.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-[#F2F0EC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmitProduct}
              className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              {/* Photo Upload + Preview Row */}
              <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-white border border-[#E7E4DD]">
                <img
                  src={productForm.image}
                  alt="Xem trước"
                  className="w-24 h-32 rounded-xl object-cover object-top bg-[#F2F0EC] shrink-0 border border-[#ECE9E2]"
                />
                <div className="flex-1 space-y-2.5">
                  <p className="text-xs font-bold text-[#171614]">Ảnh thật sản phẩm 2Hand</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#171614] hover:bg-[#2E2C29] text-white text-xs font-semibold cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingImg ? 'Đang xử lý ảnh...' : 'Tải ảnh từ máy tính'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileUpload}
                        className="hidden"
                      />
                    </label>
                    <select
                      value={
                        PRESET_IMAGES.some((i) => i.url === productForm.image)
                          ? productForm.image
                          : ''
                      }
                      onChange={(e) => {
                        if (e.target.value) {
                          setProductForm((f) => ({ ...f, image: e.target.value }));
                        }
                      }}
                      className="px-3 py-2 text-xs rounded-full bg-[#F2F0EC] border border-[#E7E4DD] outline-none"
                    >
                      <option value="">Hoặc chọn ảnh mẫu có sẵn...</option>
                      {PRESET_IMAGES.map((img) => (
                        <option key={img.url} value={img.url}>
                          {img.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    value={productForm.image.startsWith('data:') ? '' : productForm.image}
                    onChange={(e) => setProductForm((f) => ({ ...f, image: e.target.value }))}
                    placeholder="Hoặc dán đường dẫn URL ảnh (https://...)"
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-[#FAF9F6] border border-[#E7E4DD] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#44403C] mb-1">
                  Tên sản phẩm 2Hand *
                </label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="VD: Áo Khoác Denim Vintage Levi's Nhật Size L"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white border border-[#D6D3CD] focus:border-[#171614] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">Danh mục</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-[#D6D3CD] outline-none"
                  >
                    <option value="nam">Đồ Nam 2Hand</option>
                    <option value="nu">Đồ Nữ 2Hand</option>
                    <option value="phu-kien">Phụ kiện 2Hand</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">
                    Loại sản phẩm
                  </label>
                  <input
                    type="text"
                    value={productForm.subCategory}
                    onChange={(e) => setProductForm((f) => ({ ...f, subCategory: e.target.value }))}
                    placeholder="Áo khoác, Blazer, Quần..."
                    className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-[#D6D3CD] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">
                    Hãng / Xuất xứ kiện
                  </label>
                  <input
                    type="text"
                    value={productForm.originBrand}
                    onChange={(e) => setProductForm((f) => ({ ...f, originBrand: e.target.value }))}
                    placeholder="Uniqlo Japan, Zara..."
                    className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-[#D6D3CD] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">
                    Size duy nhất
                  </label>
                  <select
                    value={productForm.size}
                    onChange={(e) => setProductForm((f) => ({ ...f, size: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-[#D6D3CD] outline-none"
                  >
                    {ALL_SIZES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">
                    Độ mới (%)
                  </label>
                  <select
                    value={productForm.conditionScore}
                    onChange={(e) =>
                      setProductForm((f) => ({ ...f, conditionScore: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-[#D6D3CD] outline-none"
                  >
                    {[99, 98, 97, 96, 95, 93, 90, 88, 85].map((pct) => (
                      <option key={pct} value={pct}>
                        {pct}%
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">
                    Giá bán 2Hand *
                  </label>
                  <input
                    type="number"
                    required
                    min={10000}
                    step={10000}
                    value={productForm.price}
                    onChange={(e) => setProductForm((f) => ({ ...f, price: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-[#D6D3CD] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">
                    Giá mua mới (~)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={productForm.originalPrice}
                    onChange={(e) =>
                      setProductForm((f) => ({ ...f, originalPrice: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-[#D6D3CD] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">
                    Màu sắc chính
                  </label>
                  <select
                    value={productForm.colorKey}
                    onChange={(e) => {
                      const found = FILTER_COLORS.find((c) => c.key === e.target.value);
                      setProductForm((f) => ({
                        ...f,
                        colorKey: e.target.value,
                        colorName: found?.label || f.colorName,
                      }));
                    }}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-[#D6D3CD] outline-none"
                  >
                    {FILTER_COLORS.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">
                    Gợi ý vóc dáng
                  </label>
                  <input
                    type="text"
                    value={productForm.fitSuggestion}
                    onChange={(e) =>
                      setProductForm((f) => ({ ...f, fitSuggestion: e.target.value }))
                    }
                    placeholder="VD: 1m65 – 1m75 · 60 – 70kg"
                    className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-[#D6D3CD] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#44403C] mb-1">
                  Số đo thực tế (ngăn cách bằng dấu |)
                </label>
                <input
                  type="text"
                  value={productForm.measurementText}
                  onChange={(e) =>
                    setProductForm((f) => ({ ...f, measurementText: e.target.value }))
                  }
                  placeholder="Rộng vai: 46cm | Vòng ngực: 108cm | Dài áo: 70cm"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-[#D6D3CD] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#44403C] mb-1">
                  Ghi chú tình trạng thực tế (lỗi nhỏ nếu có / đã giặt hấp)
                </label>
                <textarea
                  rows={2}
                  value={productForm.conditionNote}
                  onChange={(e) =>
                    setProductForm((f) => ({ ...f, conditionNote: e.target.value }))
                  }
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-[#D6D3CD] outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E7E4DD]">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2.5 rounded-full text-xs font-medium text-[#78716C] hover:bg-[#EFECE6]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#171614] text-white text-xs font-semibold hover:bg-[#2E2C29]"
                >
                  {editingProduct ? 'Lưu chỉnh sửa' : 'Đăng lên kệ bán ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
