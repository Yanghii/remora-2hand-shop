import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Ruler,
  Heart,
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  Truck,
  CheckCircle2,
  ChevronDown,
  ZoomIn,
  Check,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { formatVND, getDiscountPercent } from '../utils/format';
import SizeGuideModal from './SizeGuideModal';
import ProductCard from './ProductCard';

export default function ProductDetailView({
  storeName = 'RE:MORA',
  product,
  allProducts,
  cartProductIds,
  wishlistIds,
  onToggleWishlist,
  onAddToCart,
  onBuyNow,
  onBack,
  onSelectCategory,
  onSelectProduct,
}) {
  const [activeAngleIdx, setActiveAngleIdx] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState('description');

  useEffect(() => {
    setActiveAngleIdx(0);
    setIsZoomed(false);
  }, [product.id]);

  const isSoldOut = Boolean(product.isSoldOut);
  const isInCart = cartProductIds.includes(product.id);
  const isWishlisted = wishlistIds.includes(product.id);
  const discount = getDiscountPercent(product.price, product.originalPrice);

  const galleryViews = [
    { id: 'full', label: 'Toàn dáng', transform: 'scale(1)', origin: 'center top' },
    { id: 'detail', label: 'Soi chất vải', transform: 'scale(1.6)', origin: '50% 35%' },
    { id: 'tailoring', label: 'Chi tiết phom', transform: 'scale(1.38)', origin: '50% 65%' },
  ];
  const activeView = galleryViews[activeAngleIdx] || galleryViews[0];

  const relatedProducts = allProducts
    .filter((p) => p.id !== product.id && !p.isSoldOut)
    .sort((a, b) => Number(b.category === product.category) - Number(a.category === product.category))
    .slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-4 sm:py-8 pb-28 lg:pb-10">
      {/* Breadcrumb & Back (compact on mobile) */}
      <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#F2F0EC] hover:bg-[#E7E4DD] text-xs font-semibold text-[#171614] transition-colors active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Quay lại
        </button>

        <nav className="hidden sm:flex items-center gap-1.5 text-xs text-[#78716C] flex-wrap">
          <button type="button" onClick={onBack} className="hover:text-[#171614] transition-colors">
            Trang chủ
          </button>
          <ChevronRight className="w-3.5 h-3.5" />
          <button
            type="button"
            onClick={() => onSelectCategory(product.category)}
            className="hover:text-[#171614] transition-colors"
          >
            {product.categoryLabel}
          </button>
          <ChevronRight className="w-3.5 h-3.5" />
          <span>{product.subCategory}</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[#171614] font-medium truncate max-w-xs">{product.name}</span>
        </nav>

        <span className="sm:hidden text-[11px] font-mono text-[#78716C]">
          {product.categoryLabel} · {product.sku}
        </span>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Left: Interactive Gallery */}
        <div className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-4">
          <div className="flex sm:flex-col gap-3 sm:w-24 shrink-0">
            {galleryViews.map((view, idx) => (
              <button
                key={view.id}
                type="button"
                onClick={() => {
                  setActiveAngleIdx(idx);
                  setIsZoomed(false);
                }}
                className={`relative aspect-[3/4] flex-1 sm:flex-none sm:w-24 rounded-xl overflow-hidden bg-[#F2F0EC] border-2 transition-all ${
                  activeAngleIdx === idx
                    ? 'border-[#171614] shadow-sm'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={product.image}
                  alt={view.label}
                  style={{
                    transform: view.transform,
                    transformOrigin: view.origin,
                  }}
                  className={`w-full h-full object-cover object-top ${
                    isSoldOut ? 'grayscale-[50%]' : ''
                  }`}
                />
                <span className="absolute inset-x-1 bottom-1 py-0.5 rounded bg-black/55 text-[10px] text-white text-center backdrop-blur-xs">
                  {view.label}
                </span>
              </button>
            ))}
          </div>

          <div className="relative flex-1 aspect-[3/4] bg-[#F2F0EC] rounded-3xl overflow-hidden border border-[#ECE9E2]">
            <img
              src={product.image}
              alt={product.name}
              onClick={() => setIsZoomed((z) => !z)}
              style={{
                transform: isZoomed ? 'scale(1.85)' : activeView.transform,
                transformOrigin: activeView.origin,
              }}
              className={`w-full h-full object-cover object-top transition-transform duration-500 ${
                isSoldOut ? 'grayscale-[55%] brightness-90' : ''
              } ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
            />

            {isSoldOut && (
              <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center pointer-events-none">
                <span className="px-7 py-3 rounded-full bg-[#171614]/95 text-[#FAF9F6] text-lg font-bold tracking-[0.26em] uppercase border border-white/30 shadow-2xl">
                  SOLD OUT
                </span>
                <span className="mt-2.5 text-xs font-medium text-white bg-black/55 px-3.5 py-1 rounded-full">
                  Sản phẩm độc bản này đã có chủ
                </span>
              </div>
            )}

            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#171614] text-[#FAF9F6] text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-[#D6B89E]" />
                Độ mới {product.conditionScore}%
              </span>
              <span className="px-3 py-1 rounded-full bg-white/92 text-[#171614] text-xs font-semibold">
                Độc bản 1-of-1
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsZoomed((z) => !z)}
              className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/90 hover:bg-white text-xs font-medium text-[#171614] shadow-sm backdrop-blur-sm"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              {isZoomed ? 'Thu nhỏ' : 'Soi kỹ chất vải'}
            </button>
          </div>
        </div>

        {/* Right: Second-hand Details, Condition, Flat Measurements & 1-of-1 Purchase */}
        <div className="lg:col-span-5 space-y-5">
          <div>
            <div className="flex items-center justify-between gap-2 text-xs text-[#78716C]">
              <span className="uppercase tracking-[0.14em] font-semibold text-[#A45A3E]">
                {product.originBrand}
              </span>
              <span className="font-mono text-[11px]">MÃ: {product.sku}</span>
            </div>

            <h1 className="mt-2 font-serif text-3xl sm:text-[34px] font-semibold leading-tight text-[#171614]">
              {product.name}
            </h1>

            {/* Price Box */}
            <div className="mt-4 p-4 rounded-2xl bg-[#F2F0EC] flex flex-wrap items-baseline gap-3">
              <span
                className={`text-2xl sm:text-3xl font-bold ${
                  isSoldOut ? 'text-[#8C857D] line-through' : 'text-[#171614]'
                }`}
              >
                {formatVND(product.price)}
              </span>
              {product.originalPrice && (
                <>
                  <span className="text-sm text-[#8C857D] line-through">
                    Giá mới ~{formatVND(product.originalPrice)}
                  </span>
                  {!isSoldOut && discount > 0 && (
                    <span className="ml-auto px-2.5 py-1 rounded-full bg-[#A45A3E]/12 text-[#A45A3E] text-xs font-semibold">
                      Tiết kiệm {discount}%
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Condition Inspection Card */}
          <div className="p-4 rounded-2xl bg-white border border-[#E7E4DD] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#171614]">
                Kiểm định tình trạng thực tế
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                {product.conditionLabel}
              </span>
            </div>
            <p className="text-xs text-[#57534E] leading-relaxed">{product.conditionNote}</p>
          </div>

          {/* Single 1-of-1 Size, Color & Exact Measurements */}
          <div className="p-4 rounded-2xl bg-white border border-[#E7E4DD] space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#78716C]">
                  Phiên bản duy nhất tại kho
                </p>
                <div className="mt-1 flex items-center gap-3 flex-wrap">
                  <span className="px-3 py-1 rounded-lg bg-[#171614] text-white text-sm font-bold">
                    Size {product.size}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#171614]">
                    <span
                      className="w-4 h-4 rounded-full border border-black/15"
                      style={{ backgroundColor: product.colorHex }}
                    />
                    {product.colorName}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSizeGuideOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#A45A3E] hover:underline shrink-0"
              >
                <Ruler className="w-3.5 h-3.5" />
                Đối chiếu bảng size
              </button>
            </div>

            {product.fitSuggestion && (
              <p className="text-xs text-[#57534E] bg-[#FAF9F6] px-3 py-2 rounded-xl border border-[#EFECE6]">
                <strong>Gợi ý vóc dáng:</strong> {product.fitSuggestion}
              </p>
            )}

            {/* Flat Measurements Grid */}
            {product.measurements && Object.keys(product.measurements).length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#78716C] mb-2">
                  Số đo phẳng thực tế (shop đo tay trực tiếp)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(product.measurements).map(([label, val]) => (
                    <div
                      key={label}
                      className="p-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECE9E2] text-center"
                    >
                      <p className="text-[10px] text-[#78716C]">{label}</p>
                      <p className="text-xs font-bold text-[#171614] mt-0.5">{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Availability Banner + Action Buttons */}
          {isSoldOut ? (
            <div className="p-5 rounded-2xl bg-[#171614] text-[#FAF9F6] space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold tracking-wide uppercase text-[#E7B69E]">
                <AlertCircle className="w-4 h-4" />
                SOLD OUT — Sản phẩm đã có người đặt mua
              </div>
              <p className="text-xs text-white/75 leading-relaxed">
                Vì đây là đồ second-hand độc bản (1-of-1), mỗi mẫu chỉ có duy nhất 1 chiếc. Bạn hãy khám phá các món đồ 2hand khác vẫn còn hàng bên dưới nhé!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                Còn duy nhất 1 chiếc sẵn sàng giao ngay · Đặt mua là Sold Out lập tức
              </div>

              <div className="flex items-stretch gap-2.5">
                <button
                  type="button"
                  onClick={() => onBuyNow(product)}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-full bg-[#171614] hover:bg-[#2E2C29] text-[#FAF9F6] text-sm font-semibold transition-all shadow-sm"
                >
                  <Zap className="w-4 h-4 text-[#E7B69E]" />
                  Mua ngay (Chốt chiếc này)
                </button>

                <button
                  type="button"
                  onClick={() => onAddToCart(product)}
                  className={`px-5 py-3.5 rounded-full border text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all ${
                    isInCart
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                      : 'border-[#171614] bg-white text-[#171614] hover:bg-[#F2F0EC]'
                  }`}
                >
                  {isInCart ? (
                    <>
                      <Check className="w-4 h-4" /> Đã thêm
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" /> Giỏ hàng
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onToggleWishlist(product.id)}
                  className={`w-12 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                    isWishlisted
                      ? 'border-[#A45A3E] bg-[#A45A3E] text-white'
                      : 'border-[#D6D3CD] bg-white text-[#171614] hover:border-[#171614]'
                  }`}
                  aria-label="Yêu thích"
                >
                  <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>
          )}

          {/* 2Hand Trust Badges */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {[
              { icon: CheckCircle2, title: 'Giặt hấp khử khuẩn', desc: 'Sạch thơm mặc được ngay' },
              { icon: ShieldCheck, title: 'Đúng ảnh & số đo', desc: 'Kiểm hàng trước thanh toán' },
              { icon: Truck, title: 'Giao nhanh toàn quốc', desc: 'Đóng gói chỉn chu 2-4 ngày' },
            ].map((b) => (
              <div
                key={b.title}
                className="p-3 rounded-2xl bg-white border border-[#ECE9E2] text-center"
              >
                <b.icon className="w-4 h-4 mx-auto text-[#A45A3E] mb-1.5" />
                <p className="text-[11px] font-semibold text-[#171614]">{b.title}</p>
                <p className="text-[10px] text-[#78716C] mt-0.5 leading-tight">{b.desc}</p>
              </div>
            ))}
          </div>

          {/* Accordions */}
          <div className="divide-y divide-[#E7E4DD] border-y border-[#E7E4DD]">
            {[
              {
                id: 'description',
                title: 'Mô tả chi tiết món đồ',
                content: (
                  <div className="space-y-3 text-sm text-[#44403C] leading-relaxed">
                    <p>{product.description}</p>
                    {product.highlights?.length > 0 && (
                      <ul className="space-y-1.5 list-disc pl-5 text-xs">
                        {product.highlights.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ),
              },
              {
                id: 'material',
                title: 'Chất liệu & Vệ sinh bảo quản',
                content: (
                  <div className="space-y-2 text-xs text-[#44403C] leading-relaxed">
                    <p>
                      <strong className="text-[#171614]">Chất liệu:</strong> {product.material}
                    </p>
                    {product.careInstructions?.length > 0 && (
                      <ul className="space-y-1 list-disc pl-5 pt-1">
                        {product.careInstructions.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ),
              },
            ].map((acc) => {
              const isOpen = openAccordion === acc.id;
              return (
                <div key={acc.id} className="py-3.5">
                  <button
                    type="button"
                    onClick={() => setOpenAccordion(isOpen ? '' : acc.id)}
                    className="w-full flex items-center justify-between text-sm font-semibold text-[#171614]"
                  >
                    <span>{acc.title}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#78716C] transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && <div className="pt-3">{acc.content}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Related Available 2Hand Items */}
      {relatedProducts.length > 0 && (
        <section className="mt-16 pt-12 border-t border-[#E7E4DD]">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A45A3E]">
              Đồ 2Hand vẫn còn hàng
            </p>
            <h2 className="font-serif text-3xl font-semibold text-[#171614] mt-1">
              Các món độc bản khác bạn có thể thích
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                isWishlisted={wishlistIds.includes(item.id)}
                isInCart={cartProductIds.includes(item.id)}
                onToggleWishlist={onToggleWishlist}
                onSelectProduct={onSelectProduct}
                onQuickAdd={onAddToCart}
              />
            ))}
          </div>
        </section>
      )}

      {/* Mobile Sticky Bottom Buy Bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/96 backdrop-blur-md border-t border-[#E7E4DD] px-3.5 pt-2.5 pb-safe shadow-[0_-6px_24px_rgba(0,0,0,0.08)]">
        {isSoldOut ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#A45A3E]">SOLD OUT</p>
              <p className="text-[11px] text-[#78716C]">Món độc bản này đã có chủ</p>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="px-5 py-2.5 rounded-full bg-[#171614] text-white text-xs font-semibold"
            >
              Xem món còn hàng
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="pr-1 shrink-0">
              <p className="text-[10px] text-[#78716C]">Size {product.size} · 1 chiếc</p>
              <p className="text-base font-bold text-[#171614] leading-tight">
                {formatVND(product.price)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onAddToCart(product)}
              className={`h-11 px-3.5 rounded-full border text-xs font-semibold inline-flex items-center justify-center gap-1.5 shrink-0 active:scale-95 transition-transform ${
                isInCart
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                  : 'border-[#171614] bg-white text-[#171614]'
              }`}
              aria-label="Thêm vào giỏ hàng"
            >
              {isInCart ? <Check className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
              <span>{isInCart ? 'Đã thêm' : 'Giỏ'}</span>
            </button>

            <button
              type="button"
              onClick={() => onBuyNow(product)}
              className="flex-1 h-11 rounded-full bg-[#171614] hover:bg-[#2E2C29] text-[#FAF9F6] text-xs font-bold inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
            >
              <Zap className="w-3.5 h-3.5 text-[#E7B69E]" />
              Mua ngay
            </button>
          </div>
        )}
      </div>

      {/* Size Guide Reference Modal */}
      <SizeGuideModal
        isOpen={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
        storeName={storeName}
        guideType={product.sizeGuideType}
        availableSizes={[product.size]}
      />
    </div>
  );
}
