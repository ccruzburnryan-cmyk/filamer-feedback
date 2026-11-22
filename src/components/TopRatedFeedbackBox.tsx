import { useMemo, useState } from 'react';
import { BarChart3, MessageSquareText, Star } from 'lucide-react';
import {
  CAMPUS_OFFICES,
  getOfficeById,
  type FeedbackEntry,
  type OfficeSummary,
} from '../data/offices';
import { StarDisplay } from './StarRating';

interface TopRatedFeedbackBoxProps {
  entries: FeedbackEntry[];
  summaries: Record<string, OfficeSummary>;
  onSelectOfficeToRate: (officeId: string) => void;
}

type BarScope = 'all' | 'high';

export function TopRatedFeedbackBox({
  entries,
  summaries,
  onSelectOfficeToRate,
}: TopRatedFeedbackBoxProps) {
  const [barScope, setBarScope] = useState<BarScope>('all');
  const [focusedOfficeId, setFocusedOfficeId] = useState<string>('all');

  const rankedOffices = useMemo(() => {
    const list = CAMPUS_OFFICES.map((office) => {
      const summary = summaries[office.id];
      return {
        office,
        count: summary?.count ?? 0,
        averageRating: summary?.averageRating ?? 0,
      };
    });

    list.sort((a, b) => {
      if (b.averageRating !== a.averageRating) {
        return b.averageRating - a.averageRating;
      }
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.office.name.localeCompare(b.office.name);
    });

    if (barScope === 'high') {
      return list.filter((item) => item.count > 0 && item.averageRating >= 4.0);
    }
    return list;
  }, [summaries, barScope]);

  const consolidatedEntries = useMemo(() => {
    const base =
      focusedOfficeId === 'all'
        ? entries
        : entries.filter((entry) => entry.officeId === focusedOfficeId);

    return [...base].sort((a, b) => {
      const avgA = summaries[a.officeId]?.averageRating ?? 0;
      const avgB = summaries[b.officeId]?.averageRating ?? 0;
      if (avgB !== avgA) return avgB - avgA;
      if (b.rating !== a.rating) return b.rating - a.rating;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [entries, focusedOfficeId, summaries]);

  const highRatedCount = useMemo(
    () =>
      CAMPUS_OFFICES.filter((office) => {
        const s = summaries[office.id];
        return s && s.count > 0 && s.averageRating >= 4.0;
      }).length,
    [summaries]
  );

  const focusedOffice =
    focusedOfficeId !== 'all' ? getOfficeById(focusedOfficeId) : undefined;

  return (
    <section
      aria-label="Higher-Rated Offices Bar and Consolidated Feedback"
      className="rounded-xl border border-stone-200/90 bg-[#FBF9F5]/95 p-4 shadow-lg backdrop-blur-md sm:p-6 lg:p-8"
    >
      {/* Unified Section Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-stone-200 pb-6 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-stone-500">
            <BarChart3 className="h-3.5 w-3.5 text-[#1E3A8A]" aria-hidden="true" />
            <span>Campus Ratings Leaderboard</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{highRatedCount} offices rated 4.0★ or higher</span>
          </div>
          <h2 className="mt-1.5 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-stone-900">
            Higher-Rated Offices &amp; All Feedback Box
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-stone-600">
            Compare average 5-star rating bars across every office and read all submitted essay
            feedback together in one place. Click any office bar to filter the feedback box.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 self-start rounded-lg bg-stone-100 p-1 lg:self-end">
          <button
            type="button"
            onClick={() => setBarScope('all')}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              barScope === 'all'
                ? 'bg-white text-[#1E3A8A] shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            All 13 Offices
          </button>
          <button
            type="button"
            onClick={() => setBarScope('high')}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors tabular-nums ${
              barScope === 'high'
                ? 'bg-white text-[#1E3A8A] shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Top Rated 4.0★+ ({highRatedCount})
          </button>
        </div>
      </div>

      {/* Single-Box Two-Pane Layout (Hairline Divider Only, No Nested Cards) */}
      <div className="mt-6 grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-12">
        {/* Left Pane: Rating Comparison Bars */}
        <div className="lg:col-span-6">
          <div className="mb-3 flex items-center justify-between text-xs font-semibold text-stone-500">
            <span>Office Rating Bar (Highest → Lowest)</span>
            <span className="font-mono tabular-nums">Scale: 0.0 – 5.0</span>
          </div>

          {rankedOffices.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-stone-700">
                No offices have reached a 4.0★ average yet.
              </p>
              <button
                type="button"
                onClick={() => setBarScope('all')}
                className="mt-2 text-xs font-semibold text-[#1E3A8A] underline underline-offset-4"
              >
                Show all 13 offices
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {rankedOffices.map(({ office, count, averageRating }, index) => {
                const widthPercent = count > 0 ? Math.min(100, (averageRating / 5) * 100) : 0;
                const isFocused = focusedOfficeId === office.id;
                const barColor =
                  averageRating >= 4
                    ? 'bg-amber-400'
                    : averageRating >= 3
                    ? 'bg-[#1E3A8A]'
                    : 'bg-stone-500';

                return (
                  <button
                    key={office.id}
                    type="button"
                    onClick={() =>
                      setFocusedOfficeId((prev) =>
                        prev === office.id ? 'all' : office.id
                      )
                    }
                    className={`block w-full rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] ${
                      isFocused ? 'bg-[#1E3A8A]/[0.08]' : 'hover:bg-stone-100/80'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="flex min-w-0 items-baseline gap-2">
                        <span className="font-mono text-xs font-medium text-stone-400 tabular-nums">
                          {String(index + 1).padStart(2, '0')}.
                        </span>
                        <span
                          className={`truncate text-sm font-semibold ${
                            isFocused ? 'text-[#1E3A8A]' : 'text-stone-900'
                          }`}
                        >
                          {office.name}
                        </span>
                        <span className="hidden truncate text-xs text-stone-500 sm:inline">
                          · {office.category}
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 font-mono text-xs tabular-nums">
                        <span className="inline-flex items-center gap-1 font-semibold text-stone-900">
                          <Star
                            className={`h-3.5 w-3.5 ${
                              count > 0
                                ? 'fill-amber-400 text-amber-500'
                                : 'fill-transparent text-stone-300'
                            }`}
                            aria-hidden="true"
                          />
                          {count > 0 ? averageRating.toFixed(2) : '0.00'}
                        </span>
                        <span className="text-stone-400">
                          ({count} {count === 1 ? 'essay' : 'essays'})
                        </span>
                      </div>
                    </div>

                    <div
                      aria-hidden="true"
                      className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-stone-200/80"
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Pane: Consolidated Feedback Box */}
        <div className="flex flex-col border-t border-stone-200 pt-6 lg:col-span-6 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">
                {focusedOffice
                  ? `Essay Feedback — ${focusedOffice.name}`
                  : 'All Offices Essay Feedback'}
              </h3>
              <p className="text-xs text-stone-500 tabular-nums">
                {consolidatedEntries.length}{' '}
                {consolidatedEntries.length === 1 ? 'feedback entry' : 'feedback entries'}{' '}
                consolidated
              </p>
            </div>

            <div className="flex items-center gap-3">
              {focusedOffice && (
                <button
                  type="button"
                  onClick={() => setFocusedOfficeId('all')}
                  className="whitespace-nowrap text-xs font-semibold text-[#1E3A8A] underline underline-offset-4 hover:text-blue-900"
                >
                  Show All Offices
                </button>
              )}
              {focusedOffice && (
                <button
                  type="button"
                  onClick={() => onSelectOfficeToRate(focusedOffice.id)}
                  className="whitespace-nowrap rounded-md bg-[#1E3A8A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#172D6E]"
                >
                  Rate {focusedOffice.name}
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 max-h-[420px] sm:max-h-[540px] divide-y divide-stone-200">
            {consolidatedEntries.length === 0 ? (
              <div className="flex h-full min-h-[260px] flex-col items-center justify-center py-10 text-center">
                <MessageSquareText
                  className="h-7 w-7 text-stone-400"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <p className="mt-3 text-sm font-medium text-stone-800">
                  {focusedOffice
                    ? `No feedback essays submitted for ${focusedOffice.name} yet.`
                    : 'No essay feedback has been submitted yet.'}
                </p>
                <p className="mt-1 max-w-sm text-xs text-stone-500">
                  Submitted 5-star ratings and essays from all 13 offices will appear here
                  together, ranked with the highest-rated offices first.
                </p>
                {focusedOffice && (
                  <button
                    type="button"
                    onClick={() => onSelectOfficeToRate(focusedOffice.id)}
                    className="mt-4 whitespace-nowrap rounded-lg bg-[#1E3A8A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#172D6E]"
                  >
                    Write Essay for {focusedOffice.name}
                  </button>
                )}
              </div>
            ) : (
              consolidatedEntries.map((entry) => {
                const office = getOfficeById(entry.officeId);
                const dateLabel = new Date(entry.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                return (
                  <article key={entry.id} className="py-4 first:pt-1 last:pb-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-stone-900">
                          {office?.name ?? entry.officeId}
                        </span>
                        <span aria-hidden="true" className="text-stone-300">
                          ·
                        </span>
                        <span className="text-stone-500">{dateLabel}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <StarDisplay rating={entry.rating} size="sm" />
                        <span className="font-mono text-xs font-semibold text-stone-800 tabular-nums">
                          {entry.rating}.0
                        </span>
                      </div>
                    </div>

                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-stone-700">
                      {entry.essay}
                    </p>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
