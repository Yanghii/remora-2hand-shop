import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { formatVND } from '../utils/format';

export default function Footer({ storeConfig, onSelectCategory }) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail('');
  };

  return (
    <footer className="mt-20 bg-[#171614] text-[#FAF9F6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="space-y-4">
          <span className="font-serif text-3xl font-semibold tracking-[0.18em]">
            {storeConfig.storeName}
          </span>
          <p className="text-xs text-white/65 leading-relaxed">{storeConfig.footerDescription}</p>
        </div>

        {/* Shop links */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50 mb-4">
            Danh mục mua sắm
          </h4>
          <ul className="space-y-2.5 text-sm text-white/80">
            {[
              { id: 'all', label: 'Tất cả sản phẩm' },
              { id: 'nam', label: 'Đồ Nam 2Hand' },
              { id: 'nu', label: 'Đồ Nữ 2Hand' },
              { id: 'phu-kien', label: 'Phụ kiện Vintage' },
            ].map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelectCategory(item.id)}
                  className="hover:text-[#D6B89E] transition-colors"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Support */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50 mb-4">
            Chính sách & Hỗ trợ
          </h4>
          <ul className="space-y-2.5 text-sm text-white/75">
            <li>Giặt hấp khử khuẩn & đo số đo thực tế</li>
            <li>Miễn phí giao hàng đơn từ {formatVND(storeConfig.freeShipThreshold)}</li>
            <li>{storeConfig.address}</li>
            <li>Hotline tư vấn: {storeConfig.hotline}</li>
          </ul>
        </div>

        {/* Newsletter */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50 mb-4">
            Nhận lịch lên kệ đồ mới
          </h4>
          <p className="text-xs text-white/65 mb-4 leading-relaxed">
            Đăng ký nhận thông báo mỗi khi kiện đồ 2Hand tuyển chọn mới được đăng bán.
          </p>
          {subscribed ? (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium">
              <Check className="w-4 h-4" />
              Đã đăng ký thành công!
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex items-center gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email của bạn..."
                className="flex-1 min-w-0 px-4 py-2.5 rounded-full bg-white/10 border border-white/15 text-xs text-white placeholder:text-white/45 outline-none focus:border-white/50"
              />
              <button
                type="submit"
                className="p-2.5 rounded-full bg-[#FAF9F6] text-[#171614] hover:bg-[#E7E4DD] transition-colors shrink-0"
                aria-label="Đăng ký nhận tin"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/45">
          <p>© 2026 {storeConfig.storeName}. All rights reserved.</p>
          <p>Thời trang Second-Hand tuyển chọn · Độc bản 1-of-1</p>
        </div>
      </div>
    </footer>
  );
}
