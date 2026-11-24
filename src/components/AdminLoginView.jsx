import React, { useState } from 'react';
import { Shield, Mail, Lock, ArrowLeft } from 'lucide-react';

export default function AdminLoginView({ storeName, onAdminLogin, onBackToStore }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await onAdminLogin(email.trim(), password);
      if (!res.ok) {
        setError(res.error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#171614] text-[#FAF9F6] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#211F1D] border border-white/10 rounded-3xl p-7 sm:p-9 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#A45A3E]/20 text-[#E59B7C] border border-[#A45A3E]/40 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/50 font-semibold">
            Cổng quản trị riêng biệt
          </p>
          <h1 className="font-serif text-3xl font-semibold tracking-wide text-white">
            {storeName} Admin
          </h1>
          <p className="text-xs text-white/60">
            Khu vực nội bộ dành riêng cho chủ cửa hàng. Vui lòng đăng nhập bằng tài khoản Quản trị viên.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/75 mb-1.5">
              Email Quản trị viên
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Nhập email quản trị..."
                className="w-full pl-10 pr-4 py-3 text-sm rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-white/30 focus:border-[#E59B7C] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/75 mb-1.5">Mật khẩu</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 text-sm rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-white/30 focus:border-[#E59B7C] outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-400/30 text-xs text-red-200 font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-full bg-[#FAF9F6] hover:bg-white text-[#171614] text-sm font-bold transition-colors disabled:opacity-60"
          >
            {submitting ? 'Đang xác thực quyền Admin...' : 'Đăng nhập Quản trị'}
          </button>
        </form>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={onBackToStore}
            className="inline-flex items-center gap-1.5 text-xs text-white/55 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Quay lại trang cửa hàng
          </button>
        </div>
      </div>
    </div>
  );
}
