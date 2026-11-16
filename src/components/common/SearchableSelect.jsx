import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

/**
 * A drop-in replacement for a plain <select>, fully custom-rendered (not
 * the browser's native <select> popup) so every filter across the app
 * shares one consistent box/panel style instead of picking up whatever
 * dark/light theme the OS applies to native form controls.
 *
 * `options` accepts either flat strings (value === label) or
 * `{ value, label }` objects, for filters where the stored value differs
 * from what's shown (e.g. Bulan: value "jan" -> label "Januari").
 *
 * Pass `searchable={false}` for short lists (Tahun, Jenis Premis, ...)
 * where a search box just adds clutter.
 */
export default function SearchableSelect({
  value,
  onChange,
  options = [],
  disabled = false,
  triggerClassName = '',
  wrapperClassName = 'w-full',
  placeholder = 'Pilih...',
  searchable = true,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const normOptions = useMemo(
    () => options.map((o) => (typeof o === 'object' && o !== null ? o : { value: o, label: String(o) })),
    [options]
  );

  useEffect(() => {
    function handleClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && searchable) {
      // Let the panel mount before focusing so the input actually exists.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, searchable]);

  const filteredOptions = useMemo(() => {
    if (!searchable || !query.trim()) return normOptions;
    const q = query.trim().toLowerCase();
    return normOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [normOptions, query, searchable]);

  const handlePick = (val) => {
    onChange(val);
    setOpen(false);
    setQuery('');
  };

  const currentLabel = normOptions.find((o) => o.value === value)?.label;

  return (
    <div ref={rootRef} className={`relative ${wrapperClassName}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`${triggerClassName} appearance-none w-full flex items-center justify-between gap-1.5 text-left`}
      >
        <span className="truncate">{currentLabel ?? placeholder}</span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-60" />
      </button>

      {open && !disabled && (
        <div className="absolute z-30 mt-1 w-full min-w-[160px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden">
          {searchable && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-slate-100 dark:border-slate-700">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari..."
                className="w-full text-xs bg-transparent outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setOpen(false); setQuery(''); }
                  if (e.key === 'Enter' && filteredOptions.length > 0) handlePick(filteredOptions[0].value);
                }}
              />
            </div>
          )}
          <div className="max-h-56 overflow-y-auto py-1">
            {filteredOptions.length === 0 && (
              <div className="px-3 py-2 text-xs text-slate-400 italic">Tiada padanan</div>
            )}
            {filteredOptions.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => handlePick(opt.value)}
                className={`w-full flex items-center justify-between gap-2 text-left px-3 py-1.5 text-xs font-medium truncate transition-colors ${
                  opt.value === value
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {opt.value === value && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
