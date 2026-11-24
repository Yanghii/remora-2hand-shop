export const DEFAULT_STORE_CONFIG = {
  storeName: 'RE:MORA',
  tagline: 'Curated Second-Hand · 1-of-1',
  announcement:
    'Đồ 2hand tuyển chọn · Mỗi mẫu chỉ có duy nhất 1 chiếc · Đã giặt hấp khử khuẩn · Đặt mua là Sold Out ngay',
  heroBadge: '2Hand Tuyển Chọn · Duy Nhất 1 Chiếc Mỗi Mẫu',
  hotline: '1900 6868',
  address: 'Kho tuyển chọn 2Hand — Hà Nội & TP.HCM',
  freeShipThreshold: 499000,
  footerDescription:
    'Không gian thời trang Second-Hand & Vintage tuyển chọn kỹ lưỡng từng chiếc. Mỗi sản phẩm là độc bản (1-of-1), đã được giặt hấp khử khuẩn sạch sẽ và đo kích thước thực tế trước khi lên kệ.',
};

export const DEMO_ACCOUNTS = [
  {
    id: 'acc-admin',
    name: 'Chủ shop (Admin)',
    email: 'admin@shop.vn',
    password: 'admin123',
    role: 'admin',
    phone: '0901 000 999',
  },
  {
    id: 'acc-customer',
    name: 'Nguyễn Minh Anh',
    email: 'khach@shop.vn',
    password: '123456',
    role: 'customer',
    phone: '0912 345 678',
  },
];

export const INITIAL_ORDERS = [
  {
    id: '2H-261101',
    customerEmail: 'khach@shop.vn',
    customerName: 'Nguyễn Minh Anh',
    customerPhone: '0912 345 678',
    shippingAddress: '42 Nguyễn Chí Thanh, Đống Đa, Hà Nội',
    createdAt: '22/11/2026 14:20',
    status: 'completed',
    total: 390000,
    items: [
      {
        productId: 'acc-silk-scarf',
        name: 'Khăn Lụa Twill Vuông Vintage Họa Tiết Hình Học',
        colorName: 'Kem & Cam Đất',
        size: 'Free Size',
        quantity: 1,
        price: 220000,
      },
      {
        productId: 'acc-washed-cap',
        name: 'Mũ Lưỡi Trai Cotton Washed Minimalist 2Hand',
        colorName: 'Xám Than Wash',
        size: 'Free Size',
        quantity: 1,
        price: 170000,
      },
    ],
  },
];

export const ORDER_STATUS_META = {
  pending: { label: 'Chờ xác nhận', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  shipping: { label: 'Đang giao hàng', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  completed: { label: 'Hoàn thành', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  cancelled: { label: 'Đã hủy', className: 'bg-red-100 text-red-700 border-red-200' },
};
