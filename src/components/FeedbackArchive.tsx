import { useMemo, useState } from 'react';
import { Download, MessageSquareText, Search, Trash2 } from 'lucide-react';
import {
  CAMPUS_OFFICES,
  RATING_LABELS,
  getOfficeById,
  type FeedbackEntry,
} from '../data/offices';
import { StarDisplay } from './StarRating';

interface FeedbackArchiveProps {
  entries: FeedbackEntry[];
  isLoading: boolean;
  officeFilter: string;
  onChangeOfficeFilter: (officeId: string) => void;
  onStartEvaluating: (officeId?: string) => void;
  onDeleteEntry: (id: string) => Promise<void>;
  isAdmin: boolean;
  onRequestAdminLogin: () => void;
}

export function FeedbackArchive({
  entries,
  isLoading,
  officeFilter,
  onChangeOfficeFilter,
  onStartEvaluating,
  onDeleteEntry,
  isAdmin,
  onRequestAdminLogin,
}: FeedbackArchiveProps) {
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return entries.filter((entry) => {
      if (officeFilter !== 'all' && entry.officeId !== officeFilter) return false;
      if (ratingFilter !== 'all' && entry.rating !== ratingFilter) return false;
      if (!q) return true;
      const office = getOfficeById(entry.officeId);
      return (
        entry.essay.toLowerCase().includes(q) ||
        (office?.name.toLowerCase().includes(q) ?? false) ||
        (office?.fullName.toLowerCase().includes(q) ?? false)
      );
    });
  }, [entries, officeFilter, ratingFilter, searchQuery]);

  async function handleConfirmDelete(id: string) {
    setDeletingId(id);
    setDeleteError(null);
    try {
      await onDeleteEntry(id);
      setConfirmDeleteId(null);
    } catch (error) {
      setConfirmDeleteId(null);
      setDeleteError(error instanceof Error ? error.message : 'Unable to remove this entry.');
    } finally {
      setDeletingId(null);
    }
  }

  function escapeCsvCell(value: string | number): string {
    const raw = String(value);
    const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replace(/"/g, '""')}"`;
  }

  function handleDownloadCsv() {
    if (entries.length === 0) return;

    const headers = [
      'ID',
      'Office / Department',
      'Full Unit Name',
      'Category',
      'Star Rating',
      'Rating Label',
      'Essay Feedback',
      'Submitted At',
    ];

    const rows = entries.map((entry) => {
      const office = getOfficeById(entry.officeId);
      return [
        escapeCsvCell(entry.id),
        escapeCsvCell(office?.name ?? entry.officeId),
        escapeCsvCell(office?.fullName ?? ''),
        escapeCsvCell(office?.category ?? ''),
        escapeCsvCell(entry.rating),
        escapeCsvCell(RATING_LABELS[entry.rating] ?? ''),
        escapeCsvCell(entry.essay),
        escapeCsvCell(entry.createdAt),
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `fcu-feedback-${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <section
      aria-label="Submitted Essay Feedback Archive"
      className="rounded-xl border border-stone-200/90 bg-[#FBF9F5]/95 p-4 shadow-lg backdrop-blur-md sm:p-6 lg:p-8"
    >
      <div className="flex flex-col gap-5 border-b border-stone-200 pb-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-stone-900">
              Submitted Essay Feedback Archive
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              Read written evaluations and 5-star ratings across all 13 campus offices and
              departments.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="font-mono text-xs text-stone-500 tabular-nums">
              Showing {filteredEntries.length} of {entries.length}{' '}
              {entries.length === 1 ? 'submission' : 'submissions'}
            </div>
            {isAdmin ? (
            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={entries.length === 0}
              title={
                entries.length === 0
                  ? 'No collected feedback to export yet'
                  : `Export all ${entries.length} feedback submissions as CSV`
              }
              className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 shadow-2xs transition-colors hover:border-[#1E3A8A] hover:text-[#1E3A8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Download CSV</span>
            </button>
            ) : (
              <button
                type="button"
                onClick={onRequestAdminLogin}
                className="shrink-0 whitespace-nowrap text-xs font-semibold text-[#1E3A8A] underline underline-offset-4 hover:text-blue-900"
              >
                Admin sign in
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="relative md:col-span-5">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search essay keywords or office..."
              aria-label="Search essay feedback"
              className="w-full rounded-lg border border-stone-200 bg-white py-2.5 pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
            />
          </div>

          <div className="md:col-span-4">
            <select
              value={officeFilter}
              onChange={(e) => onChangeOfficeFilter(e.target.value)}
              aria-label="Filter archive by office or department"
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
            >
              <option value="all">All 13 Offices &amp; Departments</option>
              {CAMPUS_OFFICES.map((office) => (
                <option key={office.id} value={office.id}>
                  {office.name} — {office.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={ratingFilter}
              onChange={(e) =>
                setRatingFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              aria-label="Filter archive by star rating"
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
            >
              <option value="all">All Star Ratings</option>
              <option value="5">5 Stars — Outstanding</option>
              <option value="4">4 Stars — Very Good</option>
              <option value="3">3 Stars — Satisfactory</option>
              <option value="2">2 Stars — Below Expectations</option>
              <option value="1">1 Star — Needs Attention</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-6">
        {deleteError && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50/90 p-3.5 text-sm text-red-900"
          >
            {deleteError}
          </div>
        )}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-lg border border-stone-200 bg-white p-5"
              >
                <div className="h-4 w-48 rounded bg-stone-200" />
                <div className="mt-3 h-3 w-full rounded bg-stone-100" />
                <div className="mt-2 h-3 w-4/5 rounded bg-stone-100" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-300 bg-white/80 p-10 text-center">
            <MessageSquareText
              className="mx-auto h-8 w-8 text-stone-400"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <h3 className="mt-3 font-[family-name:var(--font-display)] text-lg font-semibold text-stone-900">
              No essay feedback submitted yet
            </h3>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-stone-600">
              Be the first student, faculty member, or visitor to share a 5-star rating and
              written essay evaluation for any Filamer Christian University office.
            </p>
            <button
              type="button"
              onClick={() => onStartEvaluating()}
              className="mt-5 whitespace-nowrap rounded-lg bg-[#1E3A8A] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#172D6E]"
            >
              Write First Essay Feedback
            </button>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-300 bg-white/80 p-8 text-center">
            <p className="text-sm font-medium text-stone-700">
              No submissions match your current filters.
            </p>
            <button
              type="button"
              onClick={() => {
                onChangeOfficeFilter('all');
                setRatingFilter('all');
                setSearchQuery('');
              }}
              className="mt-3 text-xs font-semibold text-[#1E3A8A] underline underline-offset-4 hover:text-blue-900"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
            {filteredEntries.map((entry) => {
              const office = getOfficeById(entry.officeId);
              const dateLabel = new Date(entry.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              });
              const isConfirming = confirmDeleteId === entry.id;

              return (
                <article key={entry.id} className="p-4 sm:p-6">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <h3 className="text-base font-semibold text-stone-900">
                        {office?.name ?? entry.officeId}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                        <span>{office?.fullName}</span>
                        <span aria-hidden="true">·</span>
                        <span>{office?.category} Unit</span>
                        <span aria-hidden="true">·</span>
                        <time dateTime={entry.createdAt}>{dateLabel}</time>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 self-start">
                      <div className="flex items-center gap-2">
                        <StarDisplay rating={entry.rating} size="sm" />
                        <span className="font-mono text-xs font-medium text-stone-800 tabular-nums">
                          {entry.rating}.0
                        </span>
                        <span className="hidden text-xs text-stone-500 sm:inline">
                          · {RATING_LABELS[entry.rating]}
                        </span>
                      </div>

                      {!isAdmin ? null : !isConfirming ? (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(entry.id)}
                          aria-label={`Remove feedback entry for ${office?.name ?? entry.officeId}`}
                          className="rounded-md p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={deletingId === entry.id}
                            onClick={() => handleConfirmDelete(entry.id)}
                            className="whitespace-nowrap rounded-md bg-red-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-60"
                          >
                            {deletingId === entry.id ? 'Removing...' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="whitespace-nowrap rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="mt-4 max-w-prose whitespace-pre-line text-[15px] leading-relaxed text-stone-800">
                    {entry.essay}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
