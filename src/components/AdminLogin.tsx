import { useState } from 'react';
import { AlertCircle, Eye, EyeOff, Lock, LogIn } from 'lucide-react';

interface AdminLoginProps {
  onLogin: (password: string) => Promise<void>;
  onCancel: () => void;
}

export function AdminLogin({ onLogin, onCancel }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    if (!password) {
      setErrorMessage('Enter the admin password.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await onLogin(password);
      setPassword('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign in right now.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      aria-label="Admin sign in"
      className="mx-auto w-full max-w-md rounded-xl border border-stone-200/90 bg-[#FBF9F5]/95 p-6 shadow-lg backdrop-blur-md sm:p-8"
    >
      <div className="flex items-center gap-3 border-b border-stone-200 pb-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1E3A8A] text-white">
          <Lock className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-stone-900">
            Admin sign in
          </h2>
          <p className="text-sm text-stone-600">Sign in to delete feedback and export the CSV.</p>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50/90 p-3.5 text-sm text-red-900"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-5" noValidate>
        <div className="space-y-2">
          <label htmlFor="admin-password" className="block text-sm font-semibold text-stone-900">
            Password
          </label>
          <div className="relative">
            <input
              id="admin-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-stone-300 bg-white py-2.5 pl-3 pr-11 text-[15px] text-stone-900 focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 disabled:bg-stone-50 disabled:opacity-70"
            />
            <button
              type="button"
              onClick={() => setShowPassword((shown) => !shown)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A]"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full whitespace-nowrap rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50 sm:w-auto"
          >
            Back to feedback
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#1E3A8A] px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#172D6E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            <span>{isSubmitting ? 'Signing in...' : 'Sign in'}</span>
          </button>
        </div>
      </form>
    </section>
  );
}
