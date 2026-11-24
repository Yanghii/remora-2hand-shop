import React, { useState, useMemo } from 'react';
import { X, Ruler, Sparkles, Check, Info } from 'lucide-react';
import { SIZE_GUIDES, recommendSize } from '../data/sizeGuides';

export default function SizeGuideModal({
  isOpen,
  onClose,
  storeName = 'MORA',
  guideType = 'men-top',
  availableSizes = [],
  onApplyRecommendedSize,
}) {
  const isAccessory = guideType === 'accessory';
  const [activeTab, setActiveTab] = useState(isAccessory ? 'table' : 'calculator');
  const isWomen = guideType.startsWith('women');

  const [height, setHeight] = useState(isWomen ? 160 : 172);
  const [weight, setWeight] = useState(isWomen ? 51 : 67);
  const [fitPref, setFitPref] = useState('standard');

  const guide = SIZE_GUIDES[guideType] || SIZE_GUIDES['men-top'];

  const recommendation = useMemo(
    () =>
      recommendSize({
        guideType,
        height,
        weight,
        fitPref,
        availableSizes,
      }),
    [guideType, height, weight, fitPref, availableSizes]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-[#FAF9F6] w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl border border-[#E7E4DD] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-white border-b border-[#E7E4DD] flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#A45A3E] mb-1">
              <Ruler className="w-3.5 h-3.5" />
              Hướng dẫn chọn size {storeName}
            </div>
            <h3 className="font-serif text-2xl font-semibold text-[#171614]">{guide.title}</h3>
            <p className="text-xs text-[#78716C] mt-0.5">{guide.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#F2F0EC] text-[#57534E] transition-colors"
            aria-label="Đóng bảng hướng dẫn chọn size"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        {!isAccessory && (
          <div className="px-6 pt-4 bg-white border-b border-[#E7E4DD] flex gap-6">
            <button
              type="button"
              onClick={() => setActiveTab('calculator')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'calculator'
                  ? 'border-[#171614] text-[#171614]'
                  : 'border-transparent text-[#78716C] hover:text-[#171614]'
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#A45A3E]" />
              Gợi ý size theo số đo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('table')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'table'
                  ? 'border-[#171614] text-[#171614]'
                  : 'border-transparent text-[#78716C] hover:text-[#171614]'
              }`}
            >
              <Ruler className="w-4 h-4" />
              Bảng thông số chi tiết
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {activeTab === 'calculator' && !isAccessory ? (
            <div className="space-y-6">
              {/* Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="bg-white p-4 rounded-2xl border border-[#E7E4DD]">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">
                      Chiều cao
                    </label>
                    <span className="text-lg font-semibold text-[#171614]">{height} cm</span>
                  </div>
                  <input
                    type="range"
                    min={145}
                    max={195}
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full price-slider"
                  />
                  <div className="flex justify-between text-[11px] text-[#A8A29E] mt-1.5">
                    <span>145 cm</span>
                    <span>170 cm</span>
                    <span>195 cm</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-[#E7E4DD]">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">
                      Cân nặng
                    </label>
                    <span className="text-lg font-semibold text-[#171614]">{weight} kg</span>
                  </div>
                  <input
                    type="range"
                    min={38}
                    max={100}
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full price-slider"
                  />
                  <div className="flex justify-between text-[11px] text-[#A8A29E] mt-1.5">
                    <span>38 kg</span>
                    <span>68 kg</span>
                    <span>100 kg</span>
                  </div>
                </div>
              </div>

              {/* Fit Preference */}
              <div className="bg-white p-4 rounded-2xl border border-[#E7E4DD]">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#78716C] mb-3">
                  Sở thích mặc của bạn
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'fitted', label: 'Ôm gọn', desc: 'Tôn dáng sắc nét' },
                    { id: 'standard', label: 'Vừa tiêu chuẩn', desc: 'Cân đối nhất' },
                    { id: 'relaxed', label: 'Rộng thoải mái', desc: 'Thoáng & dễ layer' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFitPref(opt.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        fitPref === opt.id
                          ? 'border-[#171614] bg-[#171614] text-[#FAF9F6]'
                          : 'border-[#E7E4DD] bg-[#FAF9F6] text-[#171614] hover:border-[#171614]'
                      }`}
                    >
                      <p className="text-xs font-semibold">{opt.label}</p>
                      <p
                        className={`text-[11px] mt-0.5 ${
                          fitPref === opt.id ? 'text-white/75' : 'text-[#78716C]'
                        }`}
                      >
                        {opt.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Result Card */}
              <div className="bg-[#171614] text-[#FAF9F6] p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-[#D6B89E] font-medium">
                    Kích cỡ gợi ý dành cho bạn
                  </span>
                  <div className="flex items-baseline gap-3">
                    <span className="font-serif text-4xl font-semibold text-white">
                      Size {recommendation.size}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/15 text-white/90">
                      Độ phù hợp 96%
                    </span>
                  </div>
                  <p className="text-xs text-white/75 leading-relaxed max-w-md">
                    {recommendation.note}
                  </p>
                </div>

                {onApplyRecommendedSize && (
                  <button
                    type="button"
                    onClick={() => {
                      onApplyRecommendedSize(recommendation.size);
                      onClose();
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-full bg-[#FAF9F6] text-[#171614] text-xs font-semibold hover:bg-[#EFECE6] transition-colors shrink-0"
                  >
                    <Check className="w-4 h-4" />
                    Chọn size {recommendation.size}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Measurement Table */}
              <div className="bg-white rounded-2xl border border-[#E7E4DD] overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F2F0EC] border-b border-[#E7E4DD]">
                      {guide.columns.map((col) => (
                        <th
                          key={col}
                          className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#57534E] whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2F0EC]">
                    {guide.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#FAF9F6] transition-colors">
                        {Object.values(row).map((val, cIdx) => (
                          <td
                            key={cIdx}
                            className={`px-4 py-3 text-xs whitespace-nowrap ${
                              cIdx === 0 ? 'font-bold text-[#171614]' : 'text-[#44403C]'
                            }`}
                          >
                            {val}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tips */}
              <div className="bg-white p-4 rounded-2xl border border-[#E7E4DD] space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#171614]">
                  <Info className="w-4 h-4 text-[#A45A3E]" />
                  Lưu ý đo & chọn size
                </div>
                <ul className="space-y-1.5 text-xs text-[#57534E] list-disc pl-5">
                  {guide.tips.map((tip, i) => (
                    <li key={i} className="leading-relaxed">
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
