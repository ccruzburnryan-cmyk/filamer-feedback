import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LogOut, Menu, ShieldCheck, X } from 'lucide-react';
import {
  CAMPUS_OFFICES,
  UNIVERSITY_SEAL_SRC,
  type FeedbackEntry,
  type OfficeSummary,
} from './data/offices';
import { OfficeDirectory } from './components/OfficeDirectory';
import { FeedbackForm } from './components/FeedbackForm';
import { FeedbackArchive } from './components/FeedbackArchive';
import { RatingsOverview } from './components/RatingsOverview';
import { AdminLogin } from './components/AdminLogin';

type WorkspaceTab = 'evaluate' | 'ratings' | 'archive' | 'login';

// Students only ever see 'evaluate'. These views are for signed-in admins.
const ADMIN_TABS: WorkspaceTab[] = ['ratings', 'archive'];

const WORKSPACE_TABS: { tab: WorkspaceTab; label: string }[] = [
  { tab: 'evaluate', label: 'Evaluate Office' },
  { tab: 'ratings', label: 'Ratings' },
  { tab: 'archive', label: 'Feedback Archive' },
];

const ADMIN_TOKEN_KEY = 'fcu-admin-token';

function readStoredToken(): string | null {
  try {
    return window.sessionStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string | null) {
  try {
    if (token) window.sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    else window.sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    // Storage can be unavailable (private mode, embedded frames); sign-in then lasts until reload.
  }
}

const NAV_ITEMS: { id: string; label: string; tab: WorkspaceTab; adminOnly?: boolean }[] = [
  { id: 'submit', label: 'Submit Essay', tab: 'evaluate' },
  { id: 'ratings', label: 'Ratings', tab: 'ratings', adminOnly: true },
  { id: 'archive', label: 'Feedback Archive', tab: 'archive', adminOnly: true },
];

function createEmptySummaries(): Record<string, OfficeSummary> {
  const map: Record<string, OfficeSummary> = {};
  for (const office of CAMPUS_OFFICES) {
    map[office.id] = {
      officeId: office.id,
      count: 0,
      averageRating: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }
  return map;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('evaluate');
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>(CAMPUS_OFFICES[0].id);
  const [archiveOfficeFilter, setArchiveOfficeFilter] = useState<string>('all');
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [summaries, setSummaries] = useState<Record<string, OfficeSummary>>(createEmptySummaries);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sealImageFailed, setSealImageFailed] = useState<boolean>(false);

  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [adminToken, setAdminToken] = useState<string | null>(readStoredToken);
  const isAdmin = adminToken !== null;
  const visibleNavItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  const workspaceRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const selectedOffice = useMemo(
    () => CAMPUS_OFFICES.find((office) => office.id === selectedOfficeId) ?? CAMPUS_OFFICES[0],
    [selectedOfficeId]
  );

  const fetchFeedback = useCallback(async () => {
    // Students never load feedback data; it is available to signed-in admins only.
    if (!adminToken) {
      setEntries([]);
      setSummaries(createEmptySummaries());
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    try {
      setLoadError(null);
      const response = await fetch('/api/feedback', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (response.status === 401) {
        storeToken(null);
        setAdminToken(null);
        setActiveTab('login');
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to load campus feedback data.');
      }
      const data = (await response.json()) as {
        entries: FeedbackEntry[];
        summaries: Record<string, OfficeSummary>;
      };
      setEntries(data.entries ?? []);
      setSummaries(data.summaries ?? createEmptySummaries());
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : 'Unable to reach the feedback service.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    setIsLoading(adminToken !== null);
    fetchFeedback();
  }, [adminToken, fetchFeedback]);

  // Confirm a stored admin token is still valid (the server may have restarted).
  useEffect(() => {
    const token = readStoredToken();
    if (!token) return;
    fetch('/api/admin/session', { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.json())
      .then((data: { authenticated?: boolean }) => {
        if (!data.authenticated) {
          storeToken(null);
          setAdminToken(null);
        }
      })
      .catch(() => {
        // Network error: keep the token; the server still checks it on every admin action.
      });
  }, []);

  // Mobile menu: close on Escape or when the viewport grows to desktop width,
  // and lock page scroll while the menu is open.
  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const desktopQuery = window.matchMedia('(min-width: 768px)');
    const onBreakpointChange = () => {
      if (desktopQuery.matches) setMenuOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    desktopQuery.addEventListener('change', onBreakpointChange);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      desktopQuery.removeEventListener('change', onBreakpointChange);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  async function handleSubmitFeedback(payload: {
    officeId: string;
    rating: number;
    essay: string;
  }) {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? 'Failed to save feedback.');
    }

    // Only admins load feedback data; refresh it if an admin just submitted one.
    if (isAdmin) {
      await fetchFeedback();
    }
  }

  async function handleAdminLogin(password: string) {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error ?? 'Unable to sign in right now.');
    }
    storeToken(data.token as string);
    setAdminToken(data.token as string);
    setActiveTab('archive');
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleAdminLogout() {
    const token = adminToken;
    storeToken(null);
    setAdminToken(null);
    setMenuOpen(false);
    setActiveTab('evaluate');
    if (token) {
      fetch('/api/admin/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }

  async function handleDeleteEntry(id: string) {
    const response = await fetch(`/api/feedback/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
    });
    const data = await response.json();
    if (response.status === 401) {
      storeToken(null);
      setAdminToken(null);
      setActiveTab('login');
      throw new Error('Your admin session expired. Please sign in again.');
    }
    if (!response.ok) {
      throw new Error(data.error ?? 'Failed to remove feedback entry.');
    }
    setEntries((prev) => prev.filter((item) => item.id !== id));
    if (data.summaries) {
      setSummaries(data.summaries as Record<string, OfficeSummary>);
    }
  }

  function jumpToTab(tab: WorkspaceTab, officeId?: string) {
    if (ADMIN_TABS.includes(tab) && !isAdmin) {
      tab = 'login';
      officeId = undefined;
    }
    if (tab === 'evaluate' && officeId) {
      setSelectedOfficeId(officeId);
    }
    if (tab === 'archive' && officeId) {
      setArchiveOfficeFilter(officeId);
    }
    setActiveTab(tab);
    setMenuOpen(false);
    if (tab === 'login') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <div className="relative min-h-screen text-stone-900">
      {/* Full-viewport solid navy background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-linear-to-b from-[#0A1931] via-[#0A1D3D] to-[#061022]"
      />

      {/* Sticky Top Bar with desktop nav and mobile hamburger menu */}
      <header className="sticky top-0 z-40 border-b border-white/15 bg-[#07142B]/90 backdrop-blur-md">
        {menuOpen && (
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 cursor-default bg-black/50 md:hidden"
          />
        )}

        <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              jumpToTab('evaluate');
            }}
            className="shrink-0 whitespace-nowrap font-display text-lg font-semibold tracking-tight text-white sm:text-xl"
          >
            FCUFeedback&amp;concerns
          </a>

          <nav
            aria-label="Primary Navigation"
            className="hidden items-center gap-6 text-sm font-medium text-blue-100/90 md:flex"
          >
            {visibleNavItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => jumpToTab(item.tab)}
                className="shrink-0 whitespace-nowrap transition-colors hover:text-white hover:underline underline-offset-4"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => jumpToTab('evaluate')}
              className="hidden shrink-0 whitespace-nowrap rounded-lg bg-amber-400 px-4 py-2 text-xs font-semibold text-stone-950 transition-colors hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 sm:inline-flex"
            >
              Write Feedback
            </button>

            {isAdmin ? (
              <button
                type="button"
                onClick={handleAdminLogout}
                className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-white/25 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 md:inline-flex"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                Sign out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => jumpToTab('login')}
                className="hidden shrink-0 whitespace-nowrap rounded-lg border border-white/25 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 md:inline-flex"
              >
                Admin sign in
              </button>
            )}

            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 md:hidden"
            >
              {menuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div
            id="mobile-menu"
            className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-white/15 bg-[#07142B] shadow-xl md:hidden"
          >
            <nav
              aria-label="Mobile Navigation"
              className="mx-auto max-w-7xl space-y-1 px-4 py-3 sm:px-6"
            >
              {visibleNavItems.map((item) => {
                const isActive = activeTab === item.tab;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => jumpToTab(item.tab)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-blue-100/90 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.id === 'archive' && (
                      <span className="font-mono text-xs text-blue-200/70 tabular-nums">
                        {entries.length}
                      </span>
                    )}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => (isAdmin ? handleAdminLogout() : jumpToTab('login'))}
                aria-current={activeTab === 'login' ? 'page' : undefined}
                className="flex w-full items-center rounded-lg px-3 py-3 text-left text-base font-medium text-blue-100/90 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                {isAdmin ? 'Sign out (admin)' : 'Admin sign in'}
              </button>

              <button
                type="button"
                onClick={() => jumpToTab('evaluate')}
                className="mt-2 w-full rounded-lg bg-amber-400 px-4 py-3 text-sm font-semibold text-stone-950 transition-colors hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 sm:hidden"
              >
                Write Feedback
              </button>
            </nav>
          </div>
        )}
      </header>

      <main id="top" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        {/* Institutional Hero Masthead */}
        <section className="mb-8 flex flex-col justify-between gap-6 rounded-xl border border-white/15 bg-[#081730]/65 p-5 text-white shadow-xl backdrop-blur-md sm:p-6 lg:flex-row lg:items-center lg:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-white p-1 shadow-md sm:h-24 sm:w-24">
              {!sealImageFailed ? (
                <img
                  src={UNIVERSITY_SEAL_SRC}
                  alt="Filamer Christian University Official Seal"
                  referrerPolicy="no-referrer"
                  onError={() => setSealImageFailed(true)}
                  className="h-full w-full object-contain"
                />
              ) : (
                <ShieldCheck className="h-10 w-10 text-[#1E3A8A]" aria-hidden="true" />
              )}
            </div>

            <div className="max-w-2xl">
              <p className="text-xs font-medium tracking-wide text-amber-200/95">
                Filamer Christian University · City of Roxas, Capiz · Est. 1904
              </p>
              <h1 className="mt-1.5 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-white text-balance sm:text-4xl">
                FCUFeedback&amp;concerns
              </h1>
              <p className="mt-2.5 text-sm leading-relaxed text-blue-100/90 sm:text-base">
                Evaluate any of our {CAMPUS_OFFICES.length} academic departments and administrative offices exclusively
                through 5-star ratings and thoughtful essay feedback.
              </p>
            </div>
          </div>
        </section>

        {activeTab !== 'login' && (
          <>
        {/* Workspace Mode Bar */}
        <div ref={workspaceRef} className="mb-6 flex scroll-mt-20 flex-col justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
          {isAdmin && (
            <div
              role="tablist"
              aria-label="Admin Portal Views"
              className="flex w-full items-center gap-1 overflow-x-auto rounded-lg border border-white/15 bg-[#081730]/75 p-1 backdrop-blur-md sm:inline-flex sm:w-auto"
            >
              {WORKSPACE_TABS.map((item) => (
                <button
                  key={item.tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === item.tab}
                  onClick={() => setActiveTab(item.tab)}
                  className={`shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition-colors tabular-nums sm:px-4 ${
                    activeTab === item.tab
                      ? 'bg-[#FBF9F5] text-[#1E3A8A] shadow-xs'
                      : 'text-blue-100 hover:text-white'
                  }`}
                >
                  {item.tab === 'archive'
                    ? `Feedback Archive (${entries.length})`
                    : item.label}
                </button>
              ))}
            </div>
          )}

          <div className="text-xs text-blue-100/90 tabular-nums">
            {CAMPUS_OFFICES.length} Offices Active · 5-Star &amp; Essay Format Only
          </div>
        </div>

          </>
        )}

        {loadError && (
          <div
            role="alert"
            className="mb-6 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50/95 p-4 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <span>{loadError}</span>
            <button
              type="button"
              onClick={fetchFeedback}
              className="whitespace-nowrap rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-900 hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        )}

        {/* Active Workspace Panel */}
        {activeTab === 'login' && (
          <AdminLogin onLogin={handleAdminLogin} onCancel={() => jumpToTab('evaluate')} />
        )}

        {activeTab === 'evaluate' && (
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5 lg:max-h-190">
              <OfficeDirectory
                selectedOfficeId={selectedOffice.id}
                onSelectOffice={setSelectedOfficeId}
                summaries={summaries}
                showRatings={isAdmin}
              />
            </div>

            <div className="lg:col-span-7">
              <FeedbackForm
                key={selectedOffice.id}
                office={selectedOffice}
                summary={isAdmin ? summaries[selectedOffice.id] : undefined}
                onSubmitted={() => {}}
                onViewArchive={isAdmin ? (officeId) => jumpToTab('archive', officeId) : undefined}
                onSubmitFeedback={handleSubmitFeedback}
              />
            </div>
          </div>
        )}

        {isAdmin && activeTab === 'archive' && (
          <FeedbackArchive
            entries={entries}
            isLoading={isLoading}
            officeFilter={archiveOfficeFilter}
            onChangeOfficeFilter={setArchiveOfficeFilter}
            onStartEvaluating={(officeId) => jumpToTab('evaluate', officeId)}
            onDeleteEntry={handleDeleteEntry}
            isAdmin={isAdmin}
            onRequestAdminLogin={() => jumpToTab('login')}
          />
        )}

        {isAdmin && activeTab === 'ratings' && (
          <RatingsOverview
            summaries={summaries}
            onSelectOfficeToEvaluate={(officeId) => jumpToTab('evaluate', officeId)}
            onSelectOfficeInArchive={(officeId) => jumpToTab('archive', officeId)}
          />
        )}
      </main>

      <footer className="mt-12 border-t border-white/15 bg-[#061022]/80 py-6 text-xs text-blue-100/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <p>
            FCUFeedback&amp;concerns · Filamer Christian University
          </p>
          <p className="text-blue-200/70">
            CBA · CTE · CN · CHTM · CAS · CCS · CCJE · COE · GS · Cashier · Registrar · University
            Enterprises · Assessment
          </p>
        </div>
      </footer>
    </div>
  );
}
