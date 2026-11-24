import React from 'react';
import { X, Package, ShoppingBag } from 'lucide-react';
import { formatVND } from '../utils/format';
import { ORDER_STATUS_META } from '../data/storeConfig';

export default function CustomerOrdersDrawer({ isOpen, onClose, currentUser, orders }) {
  if (!isOpen) return null;

  const myOrders = currentUser
    ? orders.filter(
        (o) =>
          o.customerEmail.toLowerCase() === currentUser.email.toLowerCase() ||
          currentUser.role === 'admin'
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-xs" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[#FAF9F6] h-full shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 bg-white border-b border-[#E7E4DD] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Package className="w-5 h-5 text-[#171614]" />
            <div>
              <h2 className="font-serif text-2xl font-semibold text-[#171614] leading-none">
                Đơn hàng của tôi
              </h2>
              {currentUser && (
                <p className="text-[11px] text-[#78716C] mt-1">{currentUser.email}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#F2F0EC]"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {myOrders.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-3">
              <div className="w-14 h-14 rounded-full bg-[#F2F0EC] flex items-center justify-center text-[#8C857D]">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <p className="font-medium text-[#171614]">Bạn chưa có đơn hàng nào</p>
              <p className="text-xs text-[#78716C] max-w-[240px]">
                Hãy thêm sản phẩm vào giỏ hàng và đặt mua để theo dõi trạng thái giao hàng tại đây.
              </p>
            </div>
          ) : (
            myOrders.map((order) => {
              const statusInfo = ORDER_STATUS_META[order.status] || ORDER_STATUS_META.pending;
              return (
                <div
                  key={order.id}
                  className="p-4 rounded-2xl bg-white border border-[#ECE9E2] space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#F2F0EC]">
                    <div>
                      <p className="font-mono text-xs font-bold text-[#171614]">{order.id}</p>
                      <p className="text-[11px] text-[#78716C]">{order.createdAt}</p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusInfo.className}`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs text-[#44403C]">
                        <span className="pr-2">
                          <strong>{item.quantity}x</strong> {item.name} ({item.colorName} ·{' '}
                          {item.size})
                        </span>
                        <span className="font-medium shrink-0">
                          {formatVND(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-[#F2F0EC] flex items-center justify-between text-xs">
                    <span className="text-[#78716C]">Tổng thanh toán</span>
                    <span className="text-sm font-bold text-[#171614]">
                      {formatVND(order.total)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
