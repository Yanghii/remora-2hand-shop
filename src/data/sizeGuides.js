export const SIZE_GUIDES = {
  'men-top': {
    title: 'Bảng hướng dẫn chọn size Áo Nam',
    subtitle: 'Áp dụng cho áo khoác, áo sơ mi, áo polo và áo thun nam dáng tiêu chuẩn & relaxed.',
    unit: 'cm / kg',
    columns: ['Size', 'Chiều cao (cm)', 'Cân nặng (kg)', 'Vòng ngực (cm)', 'Rộng vai (cm)', 'Dài áo (cm)'],
    rows: [
      { size: 'S', height: '160 - 167', weight: '52 - 60', chest: '96 - 100', shoulder: '44', length: '68' },
      { size: 'M', height: '166 - 173', weight: '60 - 68', chest: '101 - 105', shoulder: '46', length: '70' },
      { size: 'L', height: '172 - 178', weight: '68 - 76', chest: '106 - 110', shoulder: '48', length: '72' },
      { size: 'XL', height: '176 - 183', weight: '76 - 85', chest: '111 - 116', shoulder: '50', length: '74' },
      { size: 'XXL', height: '180 - 188', weight: '85 - 94', chest: '117 - 122', shoulder: '52', length: '76' },
    ],
    tips: [
      'Nếu số đo của bạn nằm giữa 2 size, hãy ưu tiên chọn theo chiều rộng vai hoặc chọn lớn hơn 1 size nếu thích mặc thoáng.',
      'Các mẫu áo khoác (overshirt / jacket) đã được cộng sẵn độ cử động để mặc layer bên ngoài áo thun.',
    ],
  },
  'men-bottom': {
    title: 'Bảng hướng dẫn chọn size Quần Nam',
    subtitle: 'Áp dụng cho quần âu xếp ly, quần kaki và quần ống rộng nam.',
    unit: 'cm / kg',
    columns: ['Size', 'Tương đương', 'Chiều cao (cm)', 'Cân nặng (kg)', 'Vòng eo (cm)', 'Dài quần (cm)'],
    rows: [
      { size: 'S', equiv: '29', height: '160 - 168', weight: '53 - 61', waist: '74 - 77', length: '97' },
      { size: 'M', equiv: '30 - 31', height: '167 - 174', weight: '61 - 69', waist: '78 - 81', length: '99' },
      { size: 'L', equiv: '32', height: '172 - 179', weight: '69 - 77', waist: '82 - 85', length: '101' },
      { size: 'XL', equiv: '34', height: '176 - 185', weight: '77 - 86', waist: '86 - 90', length: '103' },
    ],
    tips: [
      'Đo vòng eo tại vị trí bạn thường mặc quần (ngang rốn hoặc dưới rốn 2cm).',
      'Quần xếp ly có phần hông và đùi thoải mái, ưu tiên chọn chuẩn theo vòng eo.',
    ],
  },
  'women-top': {
    title: 'Bảng hướng dẫn chọn size Áo & Blazer Nữ',
    subtitle: 'Áp dụng cho blazer, cardigan len, áo lụa và áo kiểu nữ.',
    unit: 'cm / kg',
    columns: ['Size', 'Chiều cao (cm)', 'Cân nặng (kg)', 'Vòng ngực (cm)', 'Vòng eo (cm)', 'Rộng vai (cm)'],
    rows: [
      { size: 'XS', height: '150 - 157', weight: '42 - 47', chest: '78 - 82', waist: '60 - 64', shoulder: '36' },
      { size: 'S', height: '155 - 162', weight: '47 - 53', chest: '82 - 86', waist: '64 - 68', shoulder: '37.5' },
      { size: 'M', height: '160 - 167', weight: '53 - 59', chest: '86 - 90', waist: '68 - 73', shoulder: '39' },
      { size: 'L', height: '164 - 172', weight: '59 - 66', chest: '90 - 95', waist: '73 - 78', shoulder: '40.5' },
    ],
    tips: [
      'Blazer dáng suông hiện đại có độ rộng tự nhiên — chọn đúng size thường mặc để giữ phom vai đẹp nhất.',
      'Với chất liệu lụa satin ít co giãn, bạn có thể tăng 1 size nếu thích cảm giác rủ mềm thoải mái.',
    ],
  },
  'women-dress': {
    title: 'Bảng hướng dẫn chọn size Đầm & Váy Nữ',
    subtitle: 'Áp dụng cho đầm midi, đầm wrap quấn eo và chân váy nữ.',
    unit: 'cm / kg',
    columns: ['Size', 'Chiều cao (cm)', 'Cân nặng (kg)', 'Ngực (cm)', 'Eo (cm)', 'Mông (cm)'],
    rows: [
      { size: 'XS', height: '150 - 158', weight: '42 - 47', chest: '78 - 82', waist: '60 - 64', hip: '84 - 88' },
      { size: 'S', height: '155 - 163', weight: '47 - 53', chest: '82 - 86', waist: '64 - 68', hip: '88 - 92' },
      { size: 'M', height: '160 - 168', weight: '53 - 59', chest: '86 - 90', waist: '68 - 73', hip: '92 - 96' },
      { size: 'L', height: '164 - 172', weight: '59 - 66', chest: '90 - 95', waist: '73 - 79', hip: '96 - 102' },
    ],
    tips: [
      'Đầm dáng wrap có dây buộc điều chỉnh vòng eo linh hoạt +/- 4cm.',
      'Độ dài tiêu chuẩn ngang bắp chân (khoảng 112–116cm tùy size).',
    ],
  },
  accessory: {
    title: 'Thông số kích thước Phụ Kiện',
    subtitle: 'Thiết kế Free Size dễ phối đồ và điều chỉnh linh hoạt.',
    unit: 'cm',
    columns: ['Loại phụ kiện', 'Size', 'Kích thước chuẩn', 'Điều chỉnh'],
    rows: [
      { size: 'Túi xách', type: 'Free Size', dim: '26 x 19 x 9 cm', adjust: 'Dây đeo 95 - 118 cm' },
      { size: 'Mũ lưỡi trai', type: 'Free Size', dim: 'Vòng đầu 55 - 60 cm', adjust: 'Khóa kim loại sau gáy' },
      { size: 'Kính mát', type: 'Free Size', dim: '52-19-145 mm', adjust: 'Phù hợp đa số khuôn mặt' },
      { size: 'Khăn lụa', type: 'Free Size', dim: '70 x 70 cm', adjust: 'Quàng cổ / buộc túi / tóc' },
    ],
    tips: [
      'Tất cả phụ kiện đều đi kèm túi vải dustbag hoặc hộp cứng bảo quản chính hãng MORA.',
    ],
  },
};

export function recommendSize({ guideType, height, weight, fitPref = 'standard', availableSizes = [] }) {
  if (guideType === 'accessory' || availableSizes.includes('Free Size')) {
    return {
      size: 'Free Size',
      note: 'Sản phẩm thiết kế Free Size tiêu chuẩn, dễ dàng điều chỉnh phù hợp với hầu hết vóc dáng.',
    };
  }

  const h = Number(height) || 168;
  const w = Number(weight) || 60;
  const isWomen = guideType.startsWith('women');

  let score = 0;
  if (isWomen) {
    // Baseline score for women sizes: XS(0), S(1), M(2), L(3)
    const weightScore = w < 47 ? 0 : w < 53 ? 1 : w < 60 ? 2 : 3;
    const heightScore = h < 156 ? 0 : h < 162 ? 1 : h < 168 ? 2 : 3;
    score = Math.round(weightScore * 0.7 + heightScore * 0.3);
  } else {
    // Baseline score for men sizes: S(0), M(1), L(2), XL(3), XXL(4)
    const weightScore = w < 60 ? 0 : w < 68 ? 1 : w < 76 ? 2 : w < 85 ? 3 : 4;
    const heightScore = h < 166 ? 0 : h < 173 ? 1 : h < 179 ? 2 : h < 184 ? 3 : 4;
    score = Math.round(weightScore * 0.7 + heightScore * 0.3);
  }

  if (fitPref === 'relaxed') score += 1;
  if (fitPref === 'fitted') score -= 1;

  const scale = isWomen ? ['XS', 'S', 'M', 'L'] : ['S', 'M', 'L', 'XL', 'XXL'];
  const clampedIdx = Math.max(0, Math.min(scale.length - 1, score));
  let recommended = scale[clampedIdx];

  // Fallback to closest available size if exact one isn't offered for this product
  if (availableSizes.length > 0 && !availableSizes.includes(recommended)) {
    const validIndices = availableSizes
      .map((s) => scale.indexOf(s))
      .filter((i) => i !== -1);
    if (validIndices.length > 0) {
      const closest = validIndices.reduce((prev, curr) =>
        Math.abs(curr - clampedIdx) < Math.abs(prev - clampedIdx) ? curr : prev
      );
      recommended = scale[closest];
    } else {
      recommended = availableSizes[0];
    }
  }

  const fitText =
    fitPref === 'relaxed'
      ? 'form rộng thoải mái'
      : fitPref === 'fitted'
        ? 'form gọn gàng ôm vừa'
        : 'form vừa vặn tiêu chuẩn';

  return {
    size: recommended,
    note: `Với chiều cao ${h}cm, cân nặng ${w}kg và sở thích ${fitText}, size ${recommended} là lựa chọn tối ưu nhất cho bạn.`,
  };
}
