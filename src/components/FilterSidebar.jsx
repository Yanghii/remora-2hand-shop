import React from 'react';
import { SlidersHorizontal, RotateCcw, Check, X } from 'lucide-react';
import {
  CATEGORIES,
  STYLES,
  ALL_SIZES,
  CONDITION_FILTERS,
  FILTER_COLORS,
  PRICE_RANGES,
} from '../data/products';
import { formatVND } from '../utils/format';

export default function FilterSidebar({
  filters,
  onChangeFilters,
  onResetFilters,
  availableSubCategories,
  activeFilterCount,
  isMobileDrawer = false,
  onCloseMobile,
}) {
  const toggleArrayValue = (key, value) => {
    const current = filters[key];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    onChangeFilters({ [key]: next });
  };

  return (
    <div className={`space-y-6 ${isMobileDrawer ? 'pb-6' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E7E4DD]">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#171614]" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[#171614]">
            Bộ lọc 2Hand
          </h3>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#171614] text-[#FAF9F6] text-[11px] font-medium">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#A45A3E] hover:underline"
            >
              <RotateCcw className="w-3 h-3" />
              Đặt lại
            </button>
          )}
          {isMobileDrawer && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 rounded-full hover:bg-[#EFECE6]"
              aria-label="Đóng bộ lọc"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Availability toggle (Hide Sold Out) */}
      <div className="p-3.5 rounded-2xl bg-[#F2F0EC] space-y-2.5">
        <label className="flex items-center justify-between cursor-pointer select-none">
          <span className="text-xs font-semibold text-[#171614]">
            Ẩn đồ đã bán (Sold Out)
          </span>
          <input
            type="checkbox"
            checked={filters.hideSoldOut}
            onChange={(e) => onChangeFilters({ hideSoldOut: e.target.checked })}
            className="w-4 h-4 accent-[#171614] rounded cursor-pointer"
          />
        </label>
        <label className="flex items-center justify-between cursor-pointer select-none">
          <span className="text-xs font-medium text-[#57534E]">Chỉ hiện hàng mới lên kệ</span>
          <input
            type="checkbox"
            checked={filters.onlyNew}
            onChange={(e) => onChangeFilters({ onlyNew: e.target.checked })}
            className="w-4 h-4 accent-[#A45A3E] rounded cursor-pointer"
          />
        </label>
      </div>

      {/* Category */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#78716C] mb-3">
          Danh mục
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((cat) => {
            const active = filters.category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onChangeFilters({ category: cat.id, subCategory: 'all' })}
                className={`px-3 py-2 rounded-xl text-xs font-medium border text-left transition-all ${
                  active
                    ? 'bg-[#171614] text-[#FAF9F6] border-[#171614]'
                    : 'bg-white text-[#44403C] border-[#E7E4DD] hover:border-[#171614]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Condition (%) */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#78716C] mb-3">
          Độ mới sản phẩm
        </h4>
        <div className="space-y-1.5">
          {CONDITION_FILTERS.map((cond) => {
            const active = filters.conditionMin === cond.id;
            return (
              <button
                key={cond.id}
                type="button"
                onClick={() => onChangeFilters({ conditionMin: cond.id })}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                  active
                    ? 'bg-[#171614] text-[#FAF9F6] font-medium'
                    : 'bg-white border border-[#E7E4DD] text-[#57534E] hover:border-[#171614]'
                }`}
              >
                <span>{cond.label}</span>
                {active && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Subcategory */}
      {availableSubCategories.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#78716C] mb-3">
            Loại sản phẩm
          </h4>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onChangeFilters({ subCategory: 'all' })}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filters.subCategory === 'all'
                  ? 'bg-[#171614] text-[#FAF9F6]'
                  : 'bg-[#F2F0EC] text-[#57534E] hover:bg-[#E7E4DD]'
              }`}
            >
              Tất cả
            </button>
            {availableSubCategories.map((sub) => {
              const active = filters.subCategory === sub;
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => onChangeFilters({ subCategory: active ? 'all' : sub })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    active
                      ? 'bg-[#171614] text-[#FAF9F6]'
                      : 'bg-[#F2F0EC] text-[#57534E] hover:bg-[#E7E4DD]'
                  }`}
                >
                  {sub}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Style */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#78716C] mb-3">
          Phong cách
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {STYLES.map((style) => {
            const active = filters.style === style;
            return (
              <button
                key={style}
                type="button"
                onClick={() => onChangeFilters({ style })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  active
                    ? 'bg-[#A45A3E] text-white'
                    : 'bg-white border border-[#E7E4DD] text-[#57534E] hover:border-[#A45A3E]'
                }`}
              >
                {style}
              </button>
            );
          })}
        </div>
      </div>

      {/* Size multi-select */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">
            Size thực tế
          </h4>
          {filters.sizes.length > 0 && (
            <span className="text-[11px] text-[#A45A3E] font-medium">
              Đã chọn {filters.sizes.length}
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {ALL_SIZES.map((size) => {
            const active = filters.sizes.includes(size);
            return (
              <button
                key={size}
                type="button"
                onClick={() => toggleArrayValue('sizes', size)}
                className={`py-2 px-1 rounded-lg text-xs font-medium border transition-all ${
                  active
                    ? 'bg-[#171614] text-[#FAF9F6] border-[#171614]'
                    : 'bg-white text-[#44403C] border-[#E7E4DD] hover:border-[#171614]'
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      {/* Color multi-select */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">
            Màu sắc
          </h4>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {FILTER_COLORS.map((color) => {
            const active = filters.colors.includes(color.key);
            const isLight = color.key === 'trang' || color.key === 'be';
            return (
              <button
                key={color.key}
                type="button"
                onClick={() => toggleArrayValue('colors', color.key)}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border text-xs transition-all ${
                  active
                    ? 'border-[#171614] bg-[#F2F0EC] font-medium text-[#171614]'
                    : 'border-[#E7E4DD] bg-white text-[#57534E] hover:border-[#A8A29E]'
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full border border-black/15 flex items-center justify-center shrink-0"
                  style={{ backgroundColor: color.hex }}
                >
                  {active && (
                    <Check
                      className={`w-2.5 h-2.5 ${isLight ? 'text-[#171614]' : 'text-white'}`}
                      strokeWidth={3}
                    />
                  )}
                </span>
                <span className="truncate">{color.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#78716C] mb-3">
          Mức giá 2Hand
        </h4>
        <div className="space-y-1.5">
          {PRICE_RANGES.map((range) => {
            const active = filters.priceRangeId === range.id;
            return (
              <button
                key={range.id}
                type="button"
                onClick={() =>
                  onChangeFilters({
                    priceRangeId: range.id,
                    maxPrice: range.id === 'all' ? 1500000 : range.max,
                  })
                }
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                  active
                    ? 'bg-[#171614] text-[#FAF9F6] font-medium'
                    : 'bg-white border border-[#E7E4DD] text-[#57534E] hover:border-[#171614]'
                }`}
              >
                <span>{range.label}</span>
                {active && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-[#EFECE6]">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-[#78716C]">Giá tối đa:</span>
            <span className="font-semibold text-[#171614]">{formatVND(filters.maxPrice)}</span>
          </div>
          <input
            type="range"
            min={150000}
            max={1500000}
            step={50000}
            value={filters.maxPrice}
            onChange={(e) =>
              onChangeFilters({
                priceRangeId: 'custom',
                maxPrice: Number(e.target.value),
              })
            }
            className="w-full price-slider"
          />
          <div className="flex justify-between text-[10px] text-[#A8A29E] mt-1">
            <span>150k</span>
            <span>800k</span>
            <span>1.500k</span>
          </div>
        </div>
      </div>
    </div>
  );
}
