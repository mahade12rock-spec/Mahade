import React from 'react';
import { SlidersHorizontal, X } from 'lucide-react';

export interface MacroFilters {
  proteinMin?: number;
  carbsMin?: number;
  fatsMin?: number;
  densityMin?: number;
}

interface SearchFiltersProps {
  filters: MacroFilters;
  onChange: (filters: MacroFilters) => void;
  onClear: () => void;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({ filters, onChange, onClear }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleChange = (key: keyof MacroFilters, value: string) => {
    const num = value === '' ? undefined : parseInt(value);
    onChange({ ...filters, [key]: num });
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${Object.values(filters).some(v => v !== undefined) ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'bg-slate-200/50 text-slate-400 hover:text-slate-200'}`}
      >
        <SlidersHorizontal size={14} />
        FILTERS
      </button>

      {isOpen && (
        <div className="absolute top-12 right-0 w-72 bg-slate-100 border border-slate-200 rounded-3xl p-6 shadow-2xl z-50">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Adjust Targets</h3>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Min Protein (g)</label>
              <input 
                type="number" 
                value={filters.proteinMin ?? ''}
                onChange={(e) => handleChange('proteinMin', e.target.value)}
                placeholder="20"
                className="w-full bg-slate-200/50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Min Carbs (g)</label>
              <input 
                type="number" 
                value={filters.carbsMin ?? ''}
                onChange={(e) => handleChange('carbsMin', e.target.value)}
                placeholder="40"
                className="w-full bg-slate-200/50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Min Fats (g)</label>
              <input 
                type="number" 
                value={filters.fatsMin ?? ''}
                onChange={(e) => handleChange('fatsMin', e.target.value)}
                placeholder="10"
                className="w-full bg-slate-200/50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Min Density (kcal/100g)</label>
              <input 
                type="number" 
                value={filters.densityMin ?? ''}
                onChange={(e) => handleChange('densityMin', e.target.value)}
                placeholder="300"
                className="w-full bg-slate-200/50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand/50"
              />
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 flex gap-2">
            <button onClick={onClear} className="flex-1 py-3 text-[10px] font-bold text-slate-400 uppercase hover:text-slate-200 transition-colors">Clear All</button>
            <button 
              onClick={() => setIsOpen(false)}
              className="flex-1 py-3 bg-brand text-white rounded-xl text-[10px] font-bold uppercase shadow-lg shadow-brand/20"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
