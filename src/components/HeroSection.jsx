import React from 'react';
import { ArrowRight, Sparkles, Recycle } from 'lucide-react';

export default function HeroSection({
  storeConfig,
  availableCount,
  soldCount,
  onExploreCatalog,
  onSelectCategory,
}) {
  const collections = [
    {
      id: 'nam',
      title: 'Đồ Nam 2Hand',
      subtitle: 'Workwear Nhật · Sơ mi Linen · Quần âu',
      image: '/images/men-jacket.jpg',
      badge: 'Kiện Nhật / Mỹ',
    },
    {
      id: 'nu',
      title: 'Đồ Nữ 2Hand',
      subtitle: 'Blazer COS · Đầm Hàn · Lụa Satin',
      image: '/images/women-blazer.jpg',
      badge: 'Độ mới 95% – 99%',
    },
    {
      id: 'phu-kien',
      title: 'Phụ Kiện Vintage',
      subtitle: 'Túi da thật · Kính Nhật · Khăn lụa',
      image: '/images/acc-bag.jpg',
      badge: 'Độc bản 1-of-1',
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-6 sm:pb-10 space-y-5 sm:space-y-8">
      {/* Compact Editorial Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-[#EFECE6] min-h-[290px] sm:min-h-[440px] lg:min-h-[510px] flex items-center">
        <img
          src="/images/hero-main.jpg"
          alt={`${storeConfig.storeName} ${storeConfig.heroBadge}`}
          className="absolute inset-0 w-full h-full object-cover object-[75%_center] sm:object-right"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#FAF9F6]/96 via-[#FAF9F6]/85 to-[#FAF9F6]/20 sm:via-[#FAF9F6]/60 sm:to-transparent" />

        <div className="relative z-10 max-w-xl px-5 sm:px-12 lg:px-16 py-7 sm:py-12">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm border border-[#E7E4DD] text-[11px] sm:text-xs font-medium text-[#57534E] mb-3 sm:mb-5">
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#A45A3E] shrink-0" />
            <span className="truncate">{storeConfig.heroBadge}</span>
          </div>

          <h1 className="font-serif text-[32px] sm:text-5xl lg:text-[56px] font-semibold leading-[1.08] tracking-tight text-[#171614]">
            Đồ 2hand tuyển chọn,
            <br />
            <span className="italic font-medium text-[#A45A3E]">duy nhất 1 chiếc</span> mỗi mẫu.
          </h1>

          <p className="mt-2.5 sm:mt-4 text-xs sm:text-base text-[#44403C] leading-relaxed max-w-sm sm:max-w-md">
            Độ mới 90%–99%, giặt hấp khử khuẩn & đo tay thực tế. Khách chốt đơn là tự động khóa{' '}
            <strong className="text-[#171614]">SOLD OUT</strong> ngay.
          </p>

          {/* Live 2hand availability pill */}
          <div className="mt-3.5 sm:mt-5 inline-flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-white/90 backdrop-blur-sm border border-[#E7E4DD] text-[11px] sm:text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              Còn {availableCount} món
            </span>
            <span className="text-[#D6D3CD]">|</span>
            <span className="inline-flex items-center gap-1 text-[#78716C]">
              <Recycle className="w-3 h-3 text-[#A45A3E]" />
              {soldCount} đã bán
            </span>
          </div>

          <div className="mt-4 sm:mt-6 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onExploreCatalog}
              className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3.5 rounded-full bg-[#171614] text-[#FAF9F6] text-xs sm:text-sm font-semibold hover:bg-[#2E2C29] active:scale-98 transition-all shadow-sm"
            >
              Săn đồ 2Hand ngay
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onSelectCategory('nu')}
              className="hidden sm:inline-flex px-5 py-3.5 rounded-full bg-white/90 hover:bg-white border border-[#D6D3CD] text-sm font-medium text-[#171614] transition-all"
            >
              Đồ Nữ 2Hand
            </button>
            <button
              type="button"
              onClick={() => onSelectCategory('nam')}
              className="hidden sm:inline-flex px-5 py-3.5 rounded-full bg-white/90 hover:bg-white border border-[#D6D3CD] text-sm font-medium text-[#171614] transition-all"
            >
              Đồ Nam 2Hand
            </button>
          </div>
        </div>
      </div>

      {/* Department Cards: Horizontal snap carousel on Mobile, 3-col grid on Tablet/Desktop */}
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 -mx-3.5 px-3.5 no-scrollbar md:grid md:grid-cols-3 md:gap-5 md:mx-0 md:px-0">
        {collections.map((col) => (
          <button
            key={col.id}
            type="button"
            onClick={() => onSelectCategory(col.id)}
            className="snap-start shrink-0 w-[76vw] sm:w-[46vw] md:w-auto group relative h-[155px] sm:h-[200px] lg:h-[225px] rounded-2xl overflow-hidden text-left bg-[#EFECE6] focus:outline-none active:scale-[0.99] transition-transform"
          >
            <img
              src={col.image}
              alt={col.title}
              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#171614]/82 via-[#171614]/25 to-transparent" />
            <div className="absolute top-3 left-3">
              <span className="px-2.5 py-0.5 rounded-full bg-white/92 backdrop-blur-sm text-[10px] sm:text-[11px] font-semibold text-[#171614]">
                {col.badge}
              </span>
            </div>
            <div className="absolute bottom-3.5 left-3.5 right-3.5 sm:bottom-5 sm:left-5 sm:right-5 flex items-end justify-between gap-2 text-white">
              <div className="min-w-0">
                <h2 className="font-serif text-xl sm:text-2xl font-semibold leading-tight">
                  {col.title}
                </h2>
                <p className="text-[11px] sm:text-xs text-white/85 mt-0.5 truncate">{col.subtitle}</p>
              </div>
              <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/25 backdrop-blur-sm group-hover:bg-white group-hover:text-[#171614] flex items-center justify-center transition-colors shrink-0">
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
