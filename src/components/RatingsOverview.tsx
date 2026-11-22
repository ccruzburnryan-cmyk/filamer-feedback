import { useMemo, useState } from 'react';
import { BarChart3, Star } from 'lucide-react';
import { CAMPUS_OFFICES, type CampusOffice, type OfficeSummary } from '../data/offices';
import { StarDisplay } from './StarRating';

interface RatingsOverviewProps {
  summaries: Record<string, OfficeSummary>;
  onSelectOfficeToEvaluate: (officeId: string) => void;
  onSelectOfficeInArchive: (officeId: string) => void;
}

type Scope = 'all' | 'high';
type StarKey = 1 | 2 | 3 | 4 | 5;

const STARS: StarKey[] = [5, 4, 3, 2, 1];
const EMPTY_DISTRIBUTION: Record<StarKey, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

interface RankedOffice {
  office: CampusOffice;
  count: number;
  average: number;
  distribution: Record<StarKey, number>;
}

function barColor(average: number): string {
  if (average >= 4) return 'bg-amber-400';
  if (average >= 3) return 'bg-[#1E3A8A]';
  return 'bg-stone-500';
}

function DistributionBars({ row }: { row: RankedOffice }) {
  return (
    <div className="flex items-center gap-1.5">
      {STARS.map((star) => {
        const starCount = row.distribution[star];
        const pct = row.count > 0 ? Math.round((starCount / row.count) * 100) : 0;
        return (
          <div
            key={star}
            title={`${star}★: ${starCount} (${pct}%)`}
            className="flex flex-1 flex-col items-center gap-1"
          >
            <div className="h-2 w-full overflow-hidden rounded-xs bg-stone-200">
              <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
            </div>
            <span className="font-mono text-[10px] text-stone-500 tabular-nums">{star}★</span>
          </div>
        );
      })}
    </div>
  );
}

function RowActions({
  row,
  onEvaluate,
  onRead,
}: {
  row: RankedOffice;
  onEvaluate: (officeId: string) => void;
  onRead: (officeId: string) => void;
}) {
  return (
    <div className="inline-flex items-center gap-4">
      {row.count > 0 && (
        <button
          type="button"
          onClick={() => onRead(row.office.id)}
          className="text-xs font-semibold text-[#1E3A8A] hover:underline underline-offset-4"
        >
          Read essays ({row.count})
        </button>
      )}
      <button
        type="button"
        onClick={() => onEvaluate(row.office.id)}
        className="text-xs font-medium text-stone-600 hover:text-stone-900 hover:underline underline-offset-4"
      >
        Rate office
      </button>
    </div>
  );
}

export function RatingsOverview({
  summaries,
  onSelectOfficeToEvaluate,
  onSelectOfficeInArchive,
}: RatingsOverviewProps) {
  const [scope, setScope] = useState<Scope>('all');

  const ranked = useMemo<RankedOffice[]>(() => {
    const list = CAMPUS_OFFICES.map((office) => {
      const distribution = summaries[office.id]?.distribution ?? EMPTY_DISTRIBUTION;
      const count = STARS.reduce((n, star) => n + distribution[star], 0);
      const total = STARS.reduce((n, star) => n + distribution[star] * star, 0);
      return { office, count, average: count > 0 ? total / count : 0, distribution };
    });

    list.sort((a, b) => {
      // Offices with ratings first, then highest average, then most essays, then name.
      if (a.count > 0 !== b.count > 0) return b.count > 0 ? 1 : -1;
      if (b.average !== a.average) return b.average - a.average;
      if (b.count !== a.count) return b.count - a.count;
      return a.office.name.localeCompare(b.office.name);
    });
    return list;
  }, [summaries]);

  const totals = useMemo(() => {
    let essays = 0;
    let starSum = 0;
    let rated = 0;
    let high = 0;
    for (const row of ranked) {
      if (row.count === 0) continue;
      rated += 1;
      essays += row.count;
      starSum += row.average * row.count;
      if (row.average >= 4) high += 1;
    }
    return {
      essays,
      rated,
      high,
      campusAverage: essays > 0 ? (starSum / essays).toFixed(2) : '—',
    };
  }, [ranked]);

  const visible = scope === 'high' ? ranked.filter((r) => r.count > 0 && r.average >= 4) : ranked;

  function rankLabel(row: RankedOffice, index: number): string {
    return row.count > 0 ? String(index + 1).padStart(2, '0') : '—';
  }

  return (
    <section
      aria-label="Campus ratings, ranked by average"
      className="rounded-xl border border-stone-200/90 bg-[#FBF9F5]/95 p-4 shadow-lg backdrop-blur-md sm:p-6 lg:p-8"
    >
      <div className="flex flex-col justify-between gap-5 border-b border-stone-200 pb-6 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-stone-500">
            <BarChart3 className="h-3.5 w-3.5 text-[#1E3A8A]" aria-hidden="true" />
            <span>Admin view</span>
          </div>
          <h2 className="mt-1.5 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-stone-900">
            Campus Ratings
          </h2>
          <p className="mt-1 max-w-xl text-sm text-stone-600">
            Every office ranked from highest to lowest average rating. Open an office&apos;s
            essays in the Feedback Archive.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <div>
            <div className="text-xs text-stone-500">Campus Average</div>
            <div className="mt-0.5 flex items-center gap-1.5 font-mono text-lg font-semibold text-stone-900 tabular-nums">
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" aria-hidden="true" />
              <span>{totals.campusAverage} / 5.0</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-stone-500">Total Essays</div>
            <div className="mt-0.5 font-mono text-lg font-semibold text-stone-900 tabular-nums">
              {totals.essays}
            </div>
          </div>
          <div>
            <div className="text-xs text-stone-500">Units Rated</div>
            <div className="mt-0.5 font-mono text-lg font-semibold text-stone-900 tabular-nums">
              {totals.rated} / {CAMPUS_OFFICES.length}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-1 self-start rounded-lg bg-stone-100 p-1 sm:inline-flex">
        <button
          type="button"
          onClick={() => setScope('all')}
          aria-pressed={scope === 'all'}
          className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold tabular-nums transition-colors ${
            scope === 'all' ? 'bg-white text-[#1E3A8A] shadow-xs' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          All offices ({CAMPUS_OFFICES.length})
        </button>
        <button
          type="button"
          onClick={() => setScope('high')}
          aria-pressed={scope === 'high'}
          className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold tabular-nums transition-colors ${
            scope === 'high' ? 'bg-white text-[#1E3A8A] shadow-xs' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Top rated 4.0★+ ({totals.high})
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm font-medium text-stone-700">
            No office has reached a 4.0★ average yet.
          </p>
          <button
            type="button"
            onClick={() => setScope('all')}
            className="mt-2 text-xs font-semibold text-[#1E3A8A] underline underline-offset-4"
          >
            Show all offices
          </button>
        </div>
      ) : (
        <>
          {/* Desktop and tablet: ranked table */}
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-stone-200 text-xs font-semibold text-stone-500">
                  <th className="w-10 py-3 pr-3">#</th>
                  <th className="px-3 py-3">Office / Department</th>
                  <th className="px-3 py-3">Average</th>
                  <th className="px-3 py-3 text-right">Essays</th>
                  <th className="px-3 py-3">Star Distribution (5★ → 1★)</th>
                  <th className="py-3 pl-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/80 text-sm">
                {visible.map((row, index) => (
                  <tr key={row.office.id} className="hover:bg-white/70">
                    <td className="py-4 pr-3 font-mono text-xs text-stone-400 tabular-nums">
                      {rankLabel(row, index)}
                    </td>
                    <td className="px-3 py-4">
                      <div className="font-semibold text-stone-900">{row.office.name}</div>
                      <div className="text-xs text-stone-500">
                        {row.office.fullName} · {row.office.category}
                      </div>
                    </td>
                    <td className="min-w-[170px] px-3 py-4">
                      {row.count > 0 ? (
                        <>
                          <div className="flex items-center gap-2">
                            <StarDisplay rating={row.average} size="sm" />
                            <span className="font-mono text-sm font-semibold text-stone-900 tabular-nums">
                              {row.average.toFixed(2)}
                            </span>
                          </div>
                          <div
                            aria-hidden="true"
                            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-200/80"
                          >
                            <div
                              className={`h-full rounded-full ${barColor(row.average)}`}
                              style={{ width: `${(row.average / 5) * 100}%` }}
                            />
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-stone-400">No ratings yet</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-right font-mono text-sm text-stone-800 tabular-nums">
                      {row.count}
                    </td>
                    <td className="min-w-[200px] px-3 py-4">
                      <DistributionBars row={row} />
                    </td>
                    <td className="whitespace-nowrap py-4 pl-3 text-right">
                      <RowActions
                        row={row}
                        onEvaluate={onSelectOfficeToEvaluate}
                        onRead={onSelectOfficeInArchive}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phones: one card per office */}
          <ul className="mt-4 space-y-3 md:hidden" aria-label="Office ratings">
            {visible.map((row, index) => (
              <li key={row.office.id} className="rounded-lg border border-stone-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className="mt-0.5 font-mono text-xs text-stone-400 tabular-nums">
                      {rankLabel(row, index)}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-stone-900">{row.office.name}</div>
                      <div className="text-xs text-stone-500">{row.office.fullName}</div>
                      <div className="mt-0.5 text-xs text-stone-500">{row.office.category} Unit</div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {row.count > 0 ? (
                      <>
                        <div className="font-mono text-base font-semibold text-stone-900 tabular-nums">
                          {row.average.toFixed(2)}
                        </div>
                        <div className="text-[11px] text-stone-500 tabular-nums">
                          {row.count} {row.count === 1 ? 'essay' : 'essays'}
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-stone-400">No ratings yet</span>
                    )}
                  </div>
                </div>

                {row.count > 0 && (
                  <div className="mt-3 space-y-2">
                    <div
                      aria-hidden="true"
                      className="h-2 w-full overflow-hidden rounded-full bg-stone-200/80"
                    >
                      <div
                        className={`h-full rounded-full ${barColor(row.average)}`}
                        style={{ width: `${(row.average / 5) * 100}%` }}
                      />
                    </div>
                    <DistributionBars row={row} />
                  </div>
                )}

                <div className="mt-3 border-t border-stone-100 pt-3">
                  <RowActions
                    row={row}
                    onEvaluate={onSelectOfficeToEvaluate}
                    onRead={onSelectOfficeInArchive}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
