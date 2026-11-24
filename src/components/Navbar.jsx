import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Heart,
  ShoppingBag,
  X,
  ArrowRight,
  User,
  Shield,
  Package,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { formatVND, normalizeVietnamese } from '../utils/format';

export default function Navbar({
  storeConfig,
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenAdmin,
  onOpenMyOrders,
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  products,
  onSelectProduct,
  cartCount,
  wishlistCount,
  onOpenCart,
  onOpenWishlist,
  onGoHome,
  onlySale,
  onToggleSaleNav,
  onlyNew,
  onToggleNewNav,
}) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const searchContainerRef = useRef(null);
  const accountRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchFocused(false);
      }
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setAccountMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const suggestions = searchQuery.trim()
    ? products
        .filter((p) => {
          const q = normalizeVietnamese(searchQuery);
          return (
            normalizeVietnamese(p.name).includes(q) ||
            normalizeVietnamese(p.subCategory).includes(q) ||
            normalizeVietnamese(p.categoryLabel).includes(q) ||
            normalizeVietnamese(p.originBrand || '').includes(q) ||
            normalizeVietnamese(p.style).includes(q) ||
            normalizeVietnamese(p.colorName || '').includes(q)
          );
        })
        .slice(0, 5)
    : [];

  const navItems = [
    { id: 'all', label: 'Tất cả' },
    { id: 'nam', label: 'Nam' },
    { id: 'nu', label: 'Nữ' },
    { id: 'phu-kien', label: 'Phụ kiện' },
  ];

  const isAdmin = currentUser?.role === 'admin';

  return (
    <header className="sticky top-0 z-40 bg-[#FAF9F6]/96 backdrop-blur-md border-b border-[#E7E4DD]">
      {/* Admin Preview Bar (only visible to logged-in Admin) */}
      {isAdmin && (
        <div className="bg-[#A45A3E] text-white text-[11px] sm:text-xs py-2 px-3 sm:px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 font-medium truncate">
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Chế độ xem khách (Admin)</span>
            </span>
            <button
              type="button"
              onClick={onOpenAdmin}
              className="px-3 py-1 rounded-full bg-white text-[#A45A3E] text-[11px] font-bold hover:bg-[#FAF9F6] shrink-0"
            >
              Vào Admin →
            </button>
          </div>
        </div>
      )}

      {/* Announcement bar (compact 1-line on mobile) */}
      <div className="bg-[#171614] text-[#FAF9F6] text-[10px] sm:text-xs py-1.5 sm:py-2 px-3 text-center tracking-wide">
        <p className="truncate opacity-90 max-w-4xl mx-auto">{storeConfig.announcement}</p>
      </div>

      {/* Main Header Row */}
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
        <div className="h-14 sm:h-[68px] flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <button
            type="button"
            onClick={onGoHome}
            className="flex items-baseline gap-2 group focus:outline-none shrink-0"
          >
            <span className="font-serif text-[23px] sm:text-[28px] font-semibold tracking-[0.15em] text-[#171614] whitespace-nowrap">
              {storeConfig.storeName}
            </span>
            {storeConfig.tagline && (
              <span className="hidden xl:inline text-[10px] uppercase tracking-[0.2em] text-[#78716C] border-l border-[#D6D3CD] pl-2 whitespace-nowrap">
                {storeConfig.tagline}
              </span>
            )}
          </button>

          {/* Desktop Center Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = activeCategory === item.id && !onlySale && !onlyNew;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectCategory(item.id)}
                  className={`px-3.5 py-2 text-sm font-medium rounded-full transition-all ${
                    isActive
                      ? 'bg-[#171614] text-[#FAF9F6]'
                      : 'text-[#44403C] hover:text-[#171614] hover:bg-[#EFECE6]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={onToggleNewNav}
              className={`px-3.5 py-2 text-sm font-medium rounded-full transition-all ${
                onlyNew
                  ? 'bg-[#171614] text-[#FAF9F6]'
                  : 'text-[#44403C] hover:text-[#171614] hover:bg-[#EFECE6]'
              }`}
            >
              Mới lên kệ
            </button>
            <button
              type="button"
              onClick={onToggleSaleNav}
              className={`px-3.5 py-2 text-sm font-medium rounded-full transition-all ${
                onlySale ? 'bg-[#A45A3E] text-white' : 'text-[#A45A3E] hover:bg-[#F6EAE5]'
              }`}
            >
              Đồ còn hàng
            </button>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Desktop Search Input */}
            <div ref={searchContainerRef} className="hidden md:block relative w-[220px] lg:w-[240px]">
              <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="Tìm blazer, quần âu..."
                className="w-full pl-9 pr-7 py-2 text-sm bg-[#F2F0EC] border border-transparent focus:border-[#171614] focus:bg-white rounded-full outline-none transition-all placeholder:text-[#8C857D]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[#78716C] hover:text-[#171614]"
                  aria-label="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {searchFocused && searchQuery.trim().length > 0 && (
                <div className="absolute right-0 w-[340px] mt-2 bg-white border border-[#E7E4DD] rounded-2xl shadow-xl overflow-hidden z-50">
                  {suggestions.length > 0 ? (
                    <div className="divide-y divide-[#F2F0EC]">
                      <div className="px-4 py-2.5 bg-[#FAF9F6] text-[11px] uppercase tracking-wider text-[#78716C] font-medium">
                        Gợi ý sản phẩm ({suggestions.length})
                      </div>
                      {suggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onSelectProduct(item.id);
                            setSearchFocused(false);
                          }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-[#FAF9F6] text-left transition-colors"
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            className={`w-11 h-14 object-cover rounded-lg bg-[#F2F0EC] shrink-0 ${
                              item.isSoldOut ? 'grayscale opacity-70' : ''
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-[#78716C] flex items-center gap-1.5">
                              <span>
                                {item.categoryLabel} · Size {item.size}
                              </span>
                              {item.isSoldOut && (
                                <span className="px-1.5 py-0.2 rounded bg-[#171614] text-white text-[9px] font-bold uppercase">
                                  SOLD OUT
                                </span>
                              )}
                            </p>
                            <p className="text-sm font-medium text-[#171614] truncate">{item.name}</p>
                            <p className="text-xs font-semibold text-[#A45A3E] mt-0.5">
                              {formatVND(item.price)}
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-[#A8A29E] shrink-0" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-5 text-center text-sm text-[#78716C]">
                      Không tìm thấy sản phẩm nào cho “{searchQuery}”.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Account Button */}
            <div ref={accountRef} className="relative">
              {currentUser ? (
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((v) => !v)}
                  className={`inline-flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                    isAdmin
                      ? 'border-[#A45A3E] bg-[#FDF2EE] text-[#A45A3E]'
                      : 'border-[#E7E4DD] bg-white text-[#171614] hover:border-[#171614]'
                  }`}
                >
                  {isAdmin ? (
                    <Shield className="w-3.5 h-3.5 shrink-0" />
                  ) : currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className="w-5 h-5 rounded-full object-cover shrink-0"
                    />
                  ) : currentUser.authProvider === 'zalo' ? (
                    <span className="px-1.5 py-0.5 rounded bg-[#0068FF] text-white text-[9px] font-bold leading-none shrink-0">
                      Zalo
                    </span>
                  ) : currentUser.authProvider === 'google' ? (
                    <span className="px-1.5 py-0.5 rounded bg-[#EA4335] text-white text-[9px] font-bold leading-none shrink-0">
                      G
                    </span>
                  ) : (
                    <User className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="max-w-[72px] sm:max-w-[90px] truncate">
                    {isAdmin ? 'Admin' : currentUser.name.split(' ').slice(-1)[0]}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-[#E7E4DD] bg-white hover:border-[#171614] text-xs font-semibold text-[#171614] transition-all"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Đăng nhập</span>
                </button>
              )}

              {accountMenuOpen && currentUser && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl border border-[#E7E4DD] shadow-xl overflow-hidden z-50">
                  <div className="px-4 py-3 bg-[#FAF9F6] border-b border-[#E7E4DD]">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-[#171614] truncate">{currentUser.name}</p>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isAdmin
                            ? 'bg-[#A45A3E] text-white'
                            : currentUser.authProvider === 'zalo'
                              ? 'bg-[#0068FF] text-white'
                              : currentUser.authProvider === 'google'
                                ? 'bg-[#EA4335] text-white'
                                : 'bg-[#171614] text-[#FAF9F6]'
                        }`}
                      >
                        {isAdmin
                          ? 'Admin'
                          : currentUser.authProvider === 'zalo'
                            ? 'Zalo'
                            : currentUser.authProvider === 'google'
                              ? 'Gmail'
                              : 'Khách'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#78716C] truncate mt-0.5">
                      {currentUser.authProvider === 'zalo' && currentUser.phone
                        ? `Zalo: ${currentUser.phone}`
                        : currentUser.email}
                    </p>
                  </div>

                  <div className="p-1.5 space-y-0.5">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          onOpenAdmin();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#A45A3E] hover:bg-[#FDF2EE]"
                      >
                        <Shield className="w-4 h-4" />
                        Trang Quản Trị Admin
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onOpenMyOrders();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-[#44403C] hover:bg-[#F2F0EC]"
                    >
                      <Package className="w-4 h-4" />
                      Đơn hàng của tôi
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Wishlist & Cart (on mobile they also live in Bottom Nav, keep Cart icon here too for instant glance) */}
            <button
              type="button"
              onClick={onOpenWishlist}
              className="hidden sm:flex relative p-2 rounded-full hover:bg-[#EFECE6] transition-colors"
              aria-label="Danh sách yêu thích"
            >
              <Heart className="w-5 h-5 text-[#171614]" />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#A45A3E] text-white text-[10px] font-semibold flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenCart}
              className="relative p-2 rounded-full hover:bg-[#EFECE6] transition-colors"
              aria-label="Giỏ hàng"
            >
              <ShoppingBag className="w-5 h-5 text-[#171614]" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#171614] text-[#FAF9F6] text-[10px] font-semibold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Tier 2: Full-width Search Bar + Horizontal Category Pills */}
        <div className="md:hidden pb-2.5 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm đồ 2Hand theo tên, hãng, size..."
              className="w-full pl-9 pr-9 py-2.5 text-sm bg-[#F2F0EC] border border-transparent focus:border-[#171614] focus:bg-white rounded-full outline-none placeholder:text-[#8C857D]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#78716C]"
                aria-label="Xóa tìm kiếm"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-3.5 px-3.5">
            {navItems.map((item) => {
              const isActive = activeCategory === item.id && !onlySale && !onlyNew;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectCategory(item.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                    isActive
                      ? 'bg-[#171614] text-[#FAF9F6]'
                      : 'bg-[#EFECE6] text-[#44403C]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={onToggleNewNav}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                onlyNew ? 'bg-[#171614] text-[#FAF9F6]' : 'bg-[#EFECE6] text-[#44403C]'
              }`}
            >
              Mới lên kệ
            </button>
            <button
              type="button"
              onClick={onToggleSaleNav}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                onlySale ? 'bg-[#A45A3E] text-white' : 'bg-[#FDF2EE] text-[#A45A3E]'
              }`}
            >
              Chỉ đồ còn hàng
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
