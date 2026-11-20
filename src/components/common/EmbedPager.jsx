import { ChevronLeft, ChevronRight } from 'lucide-react';

// Rows shown per page in a long table when the dashboard is embedded (so the
// table fits the frame instead of making the page tall and tiny).
export const EMBED_TABLE_ROWS = 6;

/** Compact "‹ 2 / 5 ›" pager used by tables in embedded (iframe) mode. */
export default function EmbedPager({ page, pageCount, total, onChange }) {
  if (pageCount <= 1) return null;
  const btn = 'w-6 h-6 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:border-emerald-300 disabled:opacity-30 disabled:hover:text-slate-500 disabled:hover:border-slate-200 transition-colors';
  return (
    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
      <span className="hidden md:inline text-slate-400">{total} rekod</span>
      <button type="button" className={btn} disabled={page === 0} onClick={() => onChange(page - 1)} aria-label="Halaman sebelumnya"><ChevronLeft className="w-3.5 h-3.5" /></button>
      <span className="tabular-nums">{page + 1} / {pageCount}</span>
      <button type="button" className={btn} disabled={page >= pageCount - 1} onClick={() => onChange(page + 1)} aria-label="Halaman seterusnya"><ChevronRight className="w-3.5 h-3.5" /></button>
    </div>
  );
}
