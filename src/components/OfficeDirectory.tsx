import { useMemo, useState } from 'react';
import { Search, Star } from 'lucide-react';
import {
  CAMPUS_OFFICES,
  type CampusOffice,
  type OfficeCategory,
  type OfficeSummary,
} from '../data/offices';

interface OfficeDirectoryProps {
  selectedOfficeId: string;
  onSelectOffice: (officeId: string) => void;
  summaries: Record<string, OfficeSummary>;
  showRatings?: boolean;
}

type CategoryFilter = 'All' | OfficeCategory;

export function OfficeDirectory({
  selectedOfficeId,
  onSelectOffice,
  summaries,
  showRatings = true,
}: OfficeDirectoryProps) {
  const [filter, setFilter] = useState<CategoryFilter>('All');
  const [query, setQuery] = useState('');

  const filteredOffices = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return CAMPUS_OFFICES.filter((office) => {
      if (filter !== 'All' && office.category !== filter) return false;
      if (!normalized) return true;
      return (
        office.name.toLowerCase().includes(normalized) ||
        office.fullName.toLowerCase().includes(normalized)
      );
    });
  }, [filter, query]);

  const counts = useMemo(() => {
    const academic = CAMPUS_OFFICES.filter((o) => o.category === 'Academic').length;
    const administrative = CAMPUS_OFFICES.filter((o) => o.category === 'Administrative').length;
    return { all: CAMPUS_OFFICES.length, academic, administrative };
  }, []);

  return (
    <section
      aria-label="Campus Offices and Academic Departments"
      className="flex h-full flex-col rounded-xl border border-stone-200/90 bg-[#FBF9F5]/95 p-4 shadow-lg backdrop-blur-md sm:p-7"
    >
      <div className="mb-5 flex flex-col gap-4 border-b border-stone-200 pb-5">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
            Campus Offices &amp; Departments
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Choose an office or academic unit to submit your 5-star rating and essay.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-stone-100 p-1 max-sm:grid max-sm:grid-cols-3">
          {(
            [
              { key: 'All', label: `All (${counts.all})` },
              { key: 'Academic', label: `Academic (${counts.academic})` },
              { key: 'Administrative', label: `Administrative (${counts.administrative})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`flex-1 whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] ${
                filter === tab.key
                  ? 'bg-white text-[#1E3A8A] shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a department or office..."
            aria-label="Filter offices and departments"
            className="w-full rounded-lg border border-stone-200 bg-white py-2.5 pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
          />
        </div>
      </div>

      <div className="max-h-[340px] flex-1 space-y-2 overflow-y-auto pr-1 sm:max-h-[440px] lg:max-h-none" role="listbox" aria-label="Select office">
        {filteredOffices.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-300 bg-white/70 p-6 text-center">
            <p className="text-sm font-medium text-stone-700">No matching offices found.</p>
            <button
              type="button"
              onClick={() => {
                setFilter('All');
                setQuery('');
              }}
              className="mt-2 text-xs font-semibold text-[#1E3A8A] underline underline-offset-4 hover:text-blue-900"
            >
              Reset directory filter
            </button>
          </div>
        ) : (
          filteredOffices.map((office: CampusOffice) => {
            const summary = summaries[office.id];
            const isSelected = office.id === selectedOfficeId;
            const hasRatings = summary && summary.count > 0;

            return (
              <button
                key={office.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => onSelectOffice(office.id)}
                className={`w-full rounded-lg border p-3.5 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] ${
                  isSelected
                    ? 'border-[#1E3A8A] bg-[#1E3A8A]/[0.06]'
                    : 'border-stone-200/80 bg-white/85 hover:border-stone-300 hover:bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`truncate text-sm font-semibold ${
                          isSelected ? 'text-[#1E3A8A]' : 'text-stone-900'
                        }`}
                      >
                        {office.name}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-stone-500">
                      {office.fullName}
                    </p>
                  </div>

                  {showRatings && (
                  <div className="shrink-0 text-right">
                    <div className="inline-flex items-center gap-1 text-xs font-medium text-stone-800 tabular-nums">
                      <Star
                        className={`h-3.5 w-3.5 ${
                          hasRatings
                            ? 'fill-amber-400 text-amber-500'
                            : 'fill-transparent text-stone-300'
                        }`}
                      />
                      <span>{hasRatings ? summary.averageRating.toFixed(1) : '—'}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-stone-500 tabular-nums">
                      {hasRatings
                        ? `${summary.count} ${summary.count === 1 ? 'essay' : 'essays'}`
                        : 'No essays yet'}
                    </div>
                  </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
