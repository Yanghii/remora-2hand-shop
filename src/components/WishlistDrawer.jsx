import React from 'react';
import { X, Heart, ArrowRight } from 'lucide-react';
import { formatVND } from '../utils/format';

export default function WishlistDrawer({
  isOpen,
  onClose,
  products,
  onRemoveWishlist,
  onSelectProduct,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-xs" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[#FAF9F6] h-full shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 bg-white border-b border-[#E7E4DD] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Heart className="w-5 h-5 text-[#A45A3E] fill-[#A45A3E]" />
            <h2 className="font-serif text-2xl font-semibold text-[#171614]">Đã yêu thích</h2>
            <span className="px-2 py-0.5 rounded-full bg-[#F2F0EC] text-xs font-semibold text-[#57534E]">
              {products.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#F2F0EC]"
            aria-label="Đóng danh sách yêu thích"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {products.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-12">
              <div className="w-14 h-14 rounded-full bg-[#F2F0EC] flex items-center justify-center text-[#8C857D]">
                <Heart className="w-6 h-6" />
              </div>
              <p className="font-medium text-[#171614]">Chưa có sản phẩm yêu thích</p>
              <p className="text-xs text-[#78716C] max-w-[240px]">
                Nhấn biểu tượng trái tim trên các mẫu bạn ưng ý để dễ dàng xem lại sau.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="flex gap-3.5 p-3 rounded-2xl bg-white border border-[#ECE9E2]"
                >
                  <img
                    src={p.image}
                    alt={p.name}
                    className={`w-20 h-24 rounded-xl object-cover object-top bg-[#F2F0EC] shrink-0 ${
                      p.isSoldOut ? 'grayscale opacity-75' : ''
                    }`}
                  />
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] text-[#78716C] flex items-center gap-1.5">
                          <span>
                            {p.categoryLabel} · Size {p.size}
                          </span>
                          {p.isSoldOut && (
                            <span className="px-1.5 py-0.5 rounded bg-[#171614] text-white text-[9px] font-bold uppercase">
                              SOLD OUT
                            </span>
                          )}
                        </p>
                        <h4 className="text-sm font-medium text-[#171614] line-clamp-2 leading-snug">
                          {p.name}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveWishlist(p.id)}
                        className="p-1 text-[#A8A29E] hover:text-[#171614]"
                        aria-label="Bỏ yêu thích"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-auto pt-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#171614]">
                        {formatVND(p.price)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectProduct(p.id);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#A45A3E] hover:underline"
                      >
                        {p.isSoldOut ? 'Xem lại' : 'Xem chi tiết'} <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
