import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Send } from 'lucide-react';
import { type CampusOffice, type OfficeSummary } from '../data/offices';
import { StarDisplay, StarRatingInput } from './StarRating';

interface FeedbackFormProps {
  office: CampusOffice;
  summary?: OfficeSummary;
  onSubmitted: () => void;
  onViewArchive?: (officeId: string) => void;
  onSubmitFeedback: (payload: {
    officeId: string;
    rating: number;
    essay: string;
  }) => Promise<void>;
}

const MIN_ESSAY_LENGTH = 15;
const MAX_ESSAY_LENGTH = 4000;

export function FeedbackForm({
  office,
  summary,
  onSubmitted,
  onViewArchive,
  onSubmitFeedback,
}: FeedbackFormProps) {
  const [rating, setRating] = useState<number>(0);
  const [essay, setEssay] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedOfficeName, setSubmittedOfficeName] = useState<string | null>(null);

  const trimmedLength = essay.trim().length;
  const wordCount = useMemo(() => {
    const trimmed = essay.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }, [essay]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSubmittedOfficeName(null);

    if (rating < 1 || rating > 5) {
      setErrorMessage('Please choose a 5-star rating before submitting.');
      return;
    }

    if (trimmedLength < MIN_ESSAY_LENGTH) {
      setErrorMessage(
        `Please write at least ${MIN_ESSAY_LENGTH} characters in your essay feedback.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitFeedback({
        officeId: office.id,
        rating,
        essay: essay.trim(),
      });
      setSubmittedOfficeName(office.name);
      setRating(0);
      setEssay('');
      onSubmitted();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to submit feedback right now.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      aria-label={`Submit feedback for ${office.name}`}
      className="flex h-full flex-col justify-between rounded-xl border border-stone-200/90 bg-[#FBF9F5]/95 p-4 shadow-lg backdrop-blur-md sm:p-8"
    >
      <div>
        <div className="border-b border-stone-200 pb-5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-stone-500">
            <span>{office.category} Unit</span>
            <span aria-hidden="true">·</span>
            <span>5-Star Rating &amp; Essay Evaluation</span>
            {summary && summary.count > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1.5 text-stone-700 tabular-nums">
                  <StarDisplay rating={summary.averageRating} size="sm" />
                  <span>
                    {summary.averageRating.toFixed(1)} ({summary.count}{' '}
                    {summary.count === 1 ? 'essay' : 'essays'})
                  </span>
                </span>
              </>
            )}
          </div>

          <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
            {office.name}
          </h2>
          <p className="mt-1 text-sm font-medium text-stone-700">{office.fullName}</p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
            {office.description}
          </p>
        </div>

        {submittedOfficeName && (
          <div
            role="status"
            className="mt-6 flex flex-col justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-950 sm:flex-row sm:items-center"
          >
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
              <div className="text-sm">
                <p className="font-semibold">
                  Feedback recorded for {submittedOfficeName}
                </p>
                <p className="mt-0.5 text-emerald-800">
                  Thank you! Your 5-star rating and written essay have been submitted.
                </p>
              </div>
            </div>
            {onViewArchive && (
            <button
              type="button"
              onClick={() => onViewArchive(office.id)}
              className="shrink-0 whitespace-nowrap rounded-lg border border-emerald-300 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-900 transition-colors hover:bg-emerald-100"
            >
              View in Archive
            </button>
            )}
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50/90 p-4 text-sm text-red-900"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6" noValidate>
          <div className="space-y-2.5">
            <label className="block text-sm font-semibold text-stone-900">
              1. Service &amp; Experience Rating (5-Star Scale)
            </label>
            <p id="rating-help" className="text-xs text-stone-500">
              Rate your overall experience with {office.name} from 1 to 5 stars.
            </p>
            <StarRatingInput
              value={rating}
              onChange={(nextRating) => {
                setRating(nextRating);
                if (errorMessage) setErrorMessage(null);
              }}
              disabled={isSubmitting}
              describedBy="rating-help"
            />
          </div>

          <div className="space-y-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label
                htmlFor="essay-feedback"
                className="block text-sm font-semibold text-stone-900"
              >
                2. Written Essay Feedback
              </label>
              <span className="font-mono text-xs text-stone-500 tabular-nums">
                {wordCount} {wordCount === 1 ? 'word' : 'words'} · {trimmedLength}/
                {MAX_ESSAY_LENGTH} chars
              </span>
            </div>

            <p id="essay-help" className="text-xs leading-relaxed text-stone-500">
              Share specific observations in essay form—such as staff responsiveness, clarity of
              process, facilities, or suggestions for improvement.
            </p>

            <textarea
              id="essay-feedback"
              name="essay"
              rows={7}
              maxLength={MAX_ESSAY_LENGTH}
              value={essay}
              onChange={(e) => {
                setEssay(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              disabled={isSubmitting}
              aria-describedby="essay-help"
              placeholder={`Write your essay feedback about ${office.name} here...`}
              className="w-full resize-y rounded-lg border border-stone-300 bg-white p-4 text-[15px] leading-relaxed text-stone-900 placeholder:text-stone-400 focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 disabled:bg-stone-50 disabled:opacity-70"
            />

            <div className="flex items-center justify-between text-xs text-stone-500">
              <span>
                {trimmedLength < MIN_ESSAY_LENGTH
                  ? `Minimum ${MIN_ESSAY_LENGTH} characters (${Math.max(
                      0,
                      MIN_ESSAY_LENGTH - trimmedLength
                    )} more needed)`
                  : 'Ready to submit'}
              </span>
              <span>Essay &amp; 5-star rating only</span>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-stone-200 pt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <button
              type="button"
              onClick={() => {
                setRating(0);
                setEssay('');
                setErrorMessage(null);
                setSubmittedOfficeName(null);
              }}
              disabled={isSubmitting || (rating === 0 && essay.length === 0)}
              className="w-full whitespace-nowrap rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              Clear Form
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#1E3A8A] px-6 py-2.5 sm:w-auto text-sm font-semibold text-white shadow-xs transition-colors duration-150 hover:bg-[#172D6E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              <span>{isSubmitting ? 'Submitting Feedback...' : 'Submit Feedback'}</span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
