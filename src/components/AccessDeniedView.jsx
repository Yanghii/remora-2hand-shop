import React from 'react';
import { ShieldAlert, ArrowLeft, LogOut, Lock } from 'lucide-react';

export default function AccessDeniedView({
  currentUser,
  storeName,
  onGoHome,
  onLogoutToAdmin,
}) {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-3xl border border-[#E7E4DD] p-8 text-center space-y-5 shadow-sm">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FDF2EE] text-[#A45A3E] flex items-center justify-center">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F2F0EC] text-xs font-semibold text-[#57534E]">
            <Lock className="w-3.5 h-3.5" />
            403 · Không có quyền truy cập
          </span>
          <h1 className="font-serif text-3xl font-semibold text-[#171614]">
            Khu vực dành riêng cho Quản trị viên
          </h1>
          <p className="text-sm text-[#57534E] leading-relaxed">
            Tài khoản <strong>{currentUser?.name}</strong> hiện là tài khoản{' '}
            <strong>Khách hàng</strong> nên không thể truy cập trang quản trị của{' '}
            <strong>{storeName}</strong>.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={onGoHome}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#171614] hover:bg-[#2E2C29] text-white text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Về trang mua sắm
          </button>
          <button
            type="button"
            onClick={onLogoutToAdmin}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-[#D6D3CD] bg-white hover:bg-[#F2F0EC] text-xs font-medium text-[#44403C] transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất để đổi tài khoản
          </button>
        </div>
      </div>
    </div>
  );
}
