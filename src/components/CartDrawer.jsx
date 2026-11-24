import React, { useState, useEffect } from 'react';
import {
  X,
  ShoppingBag,
  Trash2,
  Truck,
  CheckCircle2,
  Sparkles,
  User,
  Phone,
  MapPin,
} from 'lucide-react';
import { formatVND } from '../utils/format';

export default function CartDrawer({
  isOpen,
  onClose,
  storeConfig,
  currentUser,
  items,
  onRemoveItem,
  onCreateOrder,
}) {
  const [orderPlacedId, setOrderPlacedId] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setCustomerName((prev) => prev || currentUser.name || '');
      setCustomerPhone((prev) => prev || currentUser.phone || '');
    }
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const freeShipThreshold = storeConfig?.freeShipThreshold ?? 499000;
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const shippingFee = subtotal >= freeShipThreshold || subtotal === 0 ? 0 : 30000;
  const total = subtotal + shippingFee;
  const remainingForFreeShip = Math.max(0, freeShipThreshold - subtotal);
  const progressPercent =
    freeShipThreshold > 0
      ? Math.min(100, Math.round((subtotal / freeShipThreshold) * 100))
      : 100;

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !shippingAddress.trim()) {
      setError('Vui lòng nhập đầy đủ họ tên, số điện thoại và địa chỉ giao hàng.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const result = await onCreateOrder({
        items,
        total,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        shippingAddress: shippingAddress.trim(),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOrderPlacedId(result.orderId);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setOrderPlacedId(null);
    setError('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-xs"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md bg-[#FAF9F6] h-full shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-white border-b border-[#E7E4DD] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#171614]" />
            <h2 className="font-serif text-2xl font-semibold text-[#171614]">Giỏ đồ 2Hand</h2>
            <span className="px-2 py-0.5 rounded-full bg-[#F2F0EC] text-xs font-semibold text-[#57534E]">
              {items.length}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-[#F2F0EC] transition-colors"
            aria-label="Đóng giỏ hàng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free shipping progress */}
        {items.length > 0 && !orderPlacedId && (
          <div className="px-6 py-3 bg-[#F2F0EC] border-b border-[#E7E4DD]">
            <div className="flex items-center gap-2 text-xs text-[#44403C] mb-1.5">
              <Truck className="w-4 h-4 text-[#A45A3E] shrink-0" />
              {remainingForFreeShip > 0 ? (
                <span>
                  Mua thêm <strong className="text-[#171614]">{formatVND(remainingForFreeShip)}</strong> để được{' '}
                  <strong className="text-[#A45A3E]">Miễn phí vận chuyển</strong>
                </span>
              ) : (
                <span className="font-medium text-emerald-700">
                  Đơn hàng của bạn được Miễn phí vận chuyển toàn quốc!
                </span>
              )}
            </div>
            <div className="h-1.5 bg-[#E0DDD6] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#171614] rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {orderPlacedId ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-10 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="font-serif text-2xl font-semibold text-[#171614]">
                Chốt đơn thành công!
              </h3>
              <p className="text-xs font-mono px-3 py-1 rounded-full bg-[#171614] text-white font-semibold">
                Mã đơn: {orderPlacedId}
              </p>
              <p className="text-sm text-[#57534E] max-w-xs leading-relaxed">
                Sản phẩm độc bản bạn vừa đặt đã lập tức chuyển sang trạng thái{' '}
                <strong className="text-[#A45A3E]">SOLD OUT</strong> trên toàn hệ thống{' '}
                <strong>{storeConfig.storeName}</strong> để giữ riêng cho bạn.
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-3 rounded-full bg-[#171614] text-white text-sm font-medium hover:bg-[#2E2C29]"
              >
                Quay lại xem kho đồ
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-3">
              <div className="w-14 h-14 rounded-full bg-[#F2F0EC] flex items-center justify-center text-[#8C857D]">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <p className="font-medium text-[#171614]">Giỏ hàng của bạn đang trống</p>
              <p className="text-xs text-[#78716C] max-w-[250px]">
                Mỗi món đồ 2Hand tại {storeConfig.storeName} chỉ có duy nhất 1 chiếc. Chốt sớm trước khi Sold Out nhé!
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="mt-2 px-5 py-2.5 rounded-full bg-[#171614] text-white text-xs font-semibold hover:bg-[#2E2C29]"
              >
                Săn đồ ngay
              </button>
            </div>
          ) : (
            <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-5">
              {/* Items list */}
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex gap-3.5 p-3 rounded-2xl bg-white border border-[#ECE9E2]"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-24 rounded-xl object-cover object-top bg-[#F2F0EC] shrink-0"
                    />
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-medium text-[#171614] line-clamp-2 leading-snug">
                          {item.name}
                        </h4>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.productId)}
                          className="p-1 text-[#A8A29E] hover:text-red-600 transition-colors shrink-0"
                          aria-label="Xóa sản phẩm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-[#78716C] mt-1">
                        {item.colorName} · Size{' '}
                        <strong className="text-[#171614]">{item.size}</strong>
                      </p>
                      <div className="mt-auto pt-2 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F2F0EC] text-[10px] font-semibold text-[#57534E]">
                          <Sparkles className="w-2.5 h-2.5 text-[#A45A3E]" />
                          Độc bản 1 chiếc
                        </span>
                        <span className="text-sm font-bold text-[#171614]">
                          {formatVND(item.price)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recipient Info for Checkout */}
              <div className="p-4 rounded-2xl bg-white border border-[#E7E4DD] space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-[#171614]">
                  Thông tin người nhận (COD / Chuyển khoản)
                </p>

                <div className="relative">
                  <User className="w-4 h-4 text-[#8C857D] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Họ và tên người nhận *"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#FAF9F6] border border-[#E7E4DD] focus:border-[#171614] outline-none"
                  />
                </div>

                <div className="relative">
                  <Phone className="w-4 h-4 text-[#8C857D] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Số điện thoại liên hệ *"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#FAF9F6] border border-[#E7E4DD] focus:border-[#171614] outline-none"
                  />
                </div>

                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#8C857D] absolute left-3 top-2.5" />
                  <textarea
                    rows={2}
                    required
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Địa chỉ giao hàng chi tiết *"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#FAF9F6] border border-[#E7E4DD] focus:border-[#171614] outline-none"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-600 font-medium">{error}</p>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && !orderPlacedId && (
          <div className="p-6 bg-white border-t border-[#E7E4DD] space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[#57534E]">
                <span>Tạm tính ({items.length} món độc bản)</span>
                <span>{formatVND(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#57534E]">
                <span>Phí vận chuyển</span>
                <span className={shippingFee === 0 ? 'text-emerald-700 font-medium' : ''}>
                  {shippingFee === 0 ? 'Miễn phí' : formatVND(shippingFee)}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#171614] pt-2 border-t border-[#F2F0EC]">
                <span>Tổng cộng</span>
                <span>{formatVND(total)}</span>
              </div>
            </div>
            <button
              type="submit"
              form="checkout-form"
              disabled={submitting}
              className="w-full py-3.5 rounded-full bg-[#171614] hover:bg-[#2E2C29] disabled:bg-[#8C857D] text-[#FAF9F6] text-sm font-semibold transition-colors"
            >
              {submitting
                ? 'Đang chốt đơn & khóa Sold Out...'
                : `Chốt đơn ngay (Khóa Sold Out) · ${formatVND(total)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
