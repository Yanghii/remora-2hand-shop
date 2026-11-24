import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Lock,
  Mail,
  Phone,
  UserPlus,
  LogIn,
  ArrowLeft,
} from 'lucide-react';
import { api } from '../services/api';

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.87c2.26-2.08 3.57-5.15 3.57-8.64Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.87-3c-1.07.72-2.44 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.29v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.29a12 12 0 0 0 0 10.8l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.6l4 3.1c.94-2.84 3.59-4.95 6.71-4.95Z"
      />
    </svg>
  );
}

function ZaloIcon() {
  return (
    <span className="w-5 h-5 rounded-md bg-white text-[#0068FF] font-extrabold text-[10px] leading-none flex items-center justify-center shrink-0 tracking-tighter">
      Zalo
    </span>
  );
}

export default function AuthModal({
  isOpen,
  onClose,
  storeName,
  onLogin,
  onRegister,
  onSocialQuickLogin,
}) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'gmail-quick' | 'zalo-quick'
  const [providers, setProviders] = useState({ google: false, zalo: false });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    api
      .getAuthProviders()
      .then((p) => setProviders({ google: Boolean(p.google), zalo: Boolean(p.zalo) }));
  }, [isOpen]);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setMode('login');
    setError('');
    setPassword('');
    onClose();
  };

  const handleGoogleClick = () => {
    setError('');
    if (providers.google) {
      api.startOAuth('google');
      return;
    }
    setMode('gmail-quick');
  };

  const handleZaloClick = () => {
    setError('');
    if (providers.zalo) {
      api.startOAuth('zalo');
      return;
    }
    setMode('zalo-quick');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'gmail-quick') {
        const res = await onSocialQuickLogin({
          provider: 'google',
          email: email.trim(),
          name: name.trim(),
        });
        if (!res.ok) setError(res.error);
        else resetAndClose();
        return;
      }

      if (mode === 'zalo-quick') {
        const res = await onSocialQuickLogin({
          provider: 'zalo',
          phone: phone.trim(),
          name: name.trim(),
        });
        if (!res.ok) setError(res.error);
        else resetAndClose();
        return;
      }

      if (mode === 'login') {
        const res = await onLogin(email.trim(), password);
        if (!res.ok) setError(res.error);
        else resetAndClose();
      } else {
        if (!name.trim() || !email.trim() || password.length < 4) {
          setError('Vui lòng nhập đầy đủ họ tên, email và mật khẩu (tối thiểu 4 ký tự).');
          return;
        }
        const res = await onRegister({ name: name.trim(), email: email.trim(), password });
        if (!res.ok) setError(res.error);
        else resetAndClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isSocialStep = mode === 'gmail-quick' || mode === 'zalo-quick';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      onClick={resetAndClose}
    >
      <div
        className="w-full max-w-md bg-[#FAF9F6] rounded-3xl shadow-2xl border border-[#E7E4DD] overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-white border-b border-[#E7E4DD] flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-[#A45A3E]">
              Thành viên {storeName}
            </p>
            <h3 className="font-serif text-2xl font-semibold text-[#171614] mt-0.5">
              {mode === 'gmail-quick'
                ? 'Đăng nhập bằng Gmail'
                : mode === 'zalo-quick'
                  ? 'Đăng nhập bằng Zalo'
                  : mode === 'register'
                    ? 'Tạo tài khoản mua sắm'
                    : 'Đăng nhập tài khoản'}
            </h3>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="p-2 rounded-full hover:bg-[#F2F0EC]"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {isSocialStep ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#57534E] hover:text-[#171614]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Chọn cách đăng nhập khác
              </button>

              <div
                className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                  mode === 'zalo-quick'
                    ? 'bg-[#EEF5FF] border-[#0068FF]/25'
                    : 'bg-white border-[#E7E4DD]'
                }`}
              >
                {mode === 'zalo-quick' ? (
                  <span className="w-9 h-9 rounded-xl bg-[#0068FF] text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                    Zalo
                  </span>
                ) : (
                  <span className="w-9 h-9 rounded-xl bg-[#FAF9F6] border border-[#E7E4DD] flex items-center justify-center shrink-0">
                    <GoogleIcon />
                  </span>
                )}
                <p className="text-xs text-[#44403C] leading-relaxed">
                  {mode === 'zalo-quick'
                    ? 'Nhập số điện thoại Zalo của bạn để đăng nhập nhanh & tự động điền thông tin khi chốt đơn 2Hand.'
                    : 'Nhập địa chỉ Gmail của bạn để đăng nhập nhanh, lưu giỏ đồ và theo dõi đơn hàng dễ dàng.'}
                </p>
              </div>

              {mode === 'gmail-quick' ? (
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">
                    Địa chỉ Gmail *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#8C857D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tenban@gmail.com"
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-white border border-[#D6D3CD] focus:border-[#171614] outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1">
                    Số điện thoại Zalo *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#8C857D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0912 345 678"
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-white border border-[#D6D3CD] focus:border-[#0068FF] outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#44403C] mb-1">
                  Tên hiển thị của bạn (không bắt buộc)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#8C857D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={mode === 'zalo-quick' ? 'VD: Minh Anh' : 'VD: Minh Anh'}
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-white border border-[#D6D3CD] focus:border-[#171614] outline-none"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-3 rounded-full text-white text-sm font-semibold transition-colors ${
                  mode === 'zalo-quick'
                    ? 'bg-[#0068FF] hover:bg-[#0055D4]'
                    : 'bg-[#171614] hover:bg-[#2E2C29]'
                } disabled:opacity-60`}
              >
                {submitting
                  ? 'Đang đăng nhập...'
                  : mode === 'zalo-quick'
                    ? 'Tiếp tục bằng Zalo'
                    : 'Tiếp tục bằng Gmail'}
              </button>
            </form>
          ) : (
            <>
              {/* Social Login Buttons: Gmail (Google) & Zalo */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleGoogleClick}
                  className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-full bg-white hover:bg-[#F5F4F0] border border-[#D6D3CD] text-sm font-semibold text-[#171614] transition-all shadow-2xs"
                >
                  <GoogleIcon />
                  <span>Tiếp tục với Gmail (Google)</span>
                </button>

                <button
                  type="button"
                  onClick={handleZaloClick}
                  className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-full bg-[#0068FF] hover:bg-[#0055D4] text-sm font-semibold text-white transition-all shadow-2xs"
                >
                  <ZaloIcon />
                  <span>Tiếp tục với Zalo</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex items-center">
                <div className="flex-1 border-t border-[#E7E4DD]" />
                <span className="px-3 text-[11px] text-[#8C857D]">hoặc dùng Email & mật khẩu</span>
                <div className="flex-1 border-t border-[#E7E4DD]" />
              </div>

              {/* Mode Tabs */}
              <div className="grid grid-cols-2 p-1 rounded-full bg-[#EFECE6]">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className={`py-2 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    mode === 'login' ? 'bg-[#171614] text-white shadow-xs' : 'text-[#57534E]'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError('');
                  }}
                  className={`py-2 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    mode === 'register' ? 'bg-[#171614] text-white shadow-xs' : 'text-[#57534E]'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Đăng ký
                </button>
              </div>

              {/* Customer Email / Password Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                {mode === 'register' && (
                  <div>
                    <label className="block text-xs font-medium text-[#57534E] mb-1">
                      Họ và tên
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#8C857D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nguyễn Văn A"
                        className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-white border border-[#E7E4DD] focus:border-[#171614] outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1">Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#8C857D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-white border border-[#E7E4DD] focus:border-[#171614] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1">Mật khẩu</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#8C857D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-white border border-[#E7E4DD] focus:border-[#171614] outline-none"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-full bg-[#171614] hover:bg-[#2E2C29] disabled:bg-[#8C857D] text-white text-sm font-semibold transition-colors"
                >
                  {submitting
                    ? 'Đang xác thực...'
                    : mode === 'login'
                      ? 'Đăng nhập'
                      : 'Đăng ký tài khoản'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
