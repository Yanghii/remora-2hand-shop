import React from 'react';
import { Home, SlidersHorizontal, Heart, ShoppingBag, User } from 'lucide-react';

export default function MobileBottomNav({
  activeView,
  filterCount,
  wishlistCount,
  cartCount,
  currentUser,
  onGoHome,
  onOpenFilter,
  onOpenWishlist,
  onOpenCart,
  onOpenAccount,
}) {
  const items = [
    {
      id: 'home',
      label: 'Trang chủ',
      icon: Home,
      active: activeView === 'store',
      onClick: onGoHome,
      badge: 0,
    },
    {
      id: 'filter',
      label: 'Bộ lọc',
      icon: SlidersHorizontal,
      active: false,
      onClick: onOpenFilter,
      badge: filterCount,
    },
    {
      id: 'wishlist',
      label: 'Yêu thích',
      icon: Heart,
      active: false,
      onClick: onOpenWishlist,
      badge: wishlistCount,
    },
    {
      id: 'cart',
      label: 'Giỏ đồ',
      icon: ShoppingBag,
      active: false,
      onClick: onOpenCart,
      badge: cartCount,
      accentBadge: true,
    },
    {
      id: 'account',
      label: currentUser ? 'Đơn hàng' : 'Đăng nhập',
      icon: User,
      active: false,
      onClick: onOpenAccount,
      badge: 0,
    },
  ];

  return (
    <nav
      aria-label="Điều hướng di động"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#FAF9F6]/96 backdrop-blur-md border-t border-[#E7E4DD] pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]"
    >
      <div className="grid grid-cols-5 h-15">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            className={`relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors active:scale-95 ${
              item.active ? 'text-[#171614] font-semibold' : 'text-[#78716C]'
            }`}
          >
            <span className="relative">
              <item.icon className="w-5 h-5" strokeWidth={item.active ? 2.3 : 1.9} />
              {item.badge > 0 && (
                <span
                  className={`absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center ${
                    item.accentBadge
                      ? 'bg-[#A45A3E] text-white'
                      : 'bg-[#171614] text-[#FAF9F6]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </span>
            <span className="leading-none mt-0.5">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
