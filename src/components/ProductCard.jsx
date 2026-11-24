import React from 'react';
import { Heart, ShoppingBag, Check, Sparkles } from 'lucide-react';
import { formatVND, getDiscountPercent } from '../utils/format';

export default function ProductCard({
  product,
  isWishlisted,
  isInCart,
  onToggleWishlist,
  onSelectProduct,
  onQuickAdd,
}) {
  const isSoldOut = Boolean(product.isSoldOut);
  const discount = getDiscountPercent(product.price, product.originalPrice);

  return (
    <article
      className={`group flex flex-col bg-white rounded-2xl border overflow-hidden transition-all duration-300 ${
        isSoldOut
          ? 'border-[#ECE9E2] opacity-85'
          : 'border-[#ECE9E2] hover:shadow-[0_12px_32px_rgba(23,22,20,0.08)]'
      }`}
    >
      {/* Image Container */}
      <div
        onClick={() => onSelectProduct(product.id)}
        className="relative aspect-[3/4] bg-[#F2F0EC] overflow-hidden cursor-pointer"
      >
        <img
          src={product.image}
          alt={product.name}
          className={`w-full h-full object-cover object-top transition-transform duration-500 ${
            isSoldOut ? 'grayscale-[55%] brightness-90' : 'group-hover:scale-105'
          }`}
          loading="lazy"
        />

        {/* SOLD OUT Center Overlay */}
        {isSoldOut && (
          <div className="absolute inset-0 bg-black/35 flex flex-col items-center justify-center p-3">
            <span className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#171614]/92 text-[#FAF9F6] text-[11px] sm:text-sm font-bold tracking-[0.2em] uppercase border border-white/25 shadow-lg">
              SOLD OUT
            </span>
            <span className="mt-1.5 text-[10px] sm:text-[11px] font-medium text-white/90 bg-black/45 px-2.5 py-0.5 rounded-full">
              Đã có chủ
            </span>
          </div>
        )}

        {/* Top Left Badges (compact on mobile) */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col gap-1">
          {!isSoldOut && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-[#171614]/90 text-[#FAF9F6] text-[9px] sm:text-[10px] font-semibold tracking-wide backdrop-blur-xs">
              <Sparkles className="w-2.5 h-2.5 text-[#D6B89E]" />
              {product.conditionScore}%
            </span>
          )}
          {!isSoldOut && (
            <span className="px-2 py-0.5 sm:px-2.5 rounded-full bg-white/92 text-[#171614] text-[9px] sm:text-[10px] font-bold w-fit shadow-2xs">
              Size {product.size}
            </span>
          )}
        </div>

        {/* Top Right Wishlist */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(product.id);
          }}
          className={`absolute top-2 right-2 sm:top-3 sm:right-3 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center backdrop-blur-sm transition-all active:scale-90 ${
            isWishlisted
              ? 'bg-[#A45A3E] text-white'
              : 'bg-white/85 text-[#171614] hover:bg-white'
          }`}
          aria-label="Yêu thích"
        >
          <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isWishlisted ? 'fill-current' : ''}`} />
        </button>

        {/* Desktop Hover Quick-Add CTA */}
        {!isSoldOut && (
          <div className="hidden lg:block absolute inset-x-3 bottom-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdd(product);
              }}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg transition-colors ${
                isInCart
                  ? 'bg-emerald-700 text-white'
                  : 'bg-[#171614]/95 hover:bg-[#171614] text-[#FAF9F6]'
              }`}
            >
              {isInCart ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Đã có trong giỏ
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5" /> Thêm nhanh · Size {product.size}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Product Info (refined mobile density) */}
      <div className="p-2.5 sm:p-4 flex flex-col flex-1">
        <p className="text-[10px] sm:text-[11px] text-[#78716C] truncate">{product.originBrand}</p>

        <button
          type="button"
          onClick={() => onSelectProduct(product.id)}
          className="mt-1 text-left text-[13px] sm:text-sm font-medium text-[#171614] group-hover:text-[#A45A3E] transition-colors line-clamp-2 leading-snug"
        >
          {product.name}
        </button>

        {/* Color & Size */}
        <div className="mt-1.5 sm:mt-2 flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[#57534E]">
          <span
            className="w-3 h-3 rounded-full border border-black/15 shrink-0"
            style={{ backgroundColor: product.colorHex }}
          />
          <span className="truncate">{product.colorName.split('(')[0].trim()}</span>
          {discount > 0 && !isSoldOut && (
            <span className="ml-auto text-[9px] sm:text-[10px] font-bold text-[#A45A3E] shrink-0">
              -{discount}%
            </span>
          )}
        </div>

        {/* Price + Always-Visible Mobile Touch Quick-Add Button */}
        <div className="mt-auto pt-2.5 sm:pt-3 flex items-center justify-between gap-1.5">
          <div className="min-w-0">
            <span
              className={`block text-[14px] sm:text-[15px] font-bold leading-tight ${
                isSoldOut ? 'text-[#8C857D] line-through' : 'text-[#171614]'
              }`}
            >
              {formatVND(product.price)}
            </span>
            {!isSoldOut && product.originalPrice && (
              <span className="block text-[10px] sm:text-[11px] text-[#A8A29E] line-through">
                {formatVND(product.originalPrice)}
              </span>
            )}
          </div>

          {isSoldOut ? (
            <span className="text-[9px] sm:text-[10px] font-bold uppercase px-2 py-1 rounded-lg bg-[#F2F0EC] text-[#78716C] shrink-0">
              Sold Out
            </span>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdd(product);
              }}
              aria-label="Thêm vào giỏ"
              className={`lg:hidden w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 ${
                isInCart
                  ? 'bg-emerald-700 text-white'
                  : 'bg-[#171614] text-[#FAF9F6]'
              }`}
            >
              {isInCart ? <Check className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
