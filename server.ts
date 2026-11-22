import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { createServer as createViteServer } from 'vite';

// Load local settings. .env.local wins over .env; real environment variables win over both.
dotenv.config({ path: ['.env.local', '.env'] });

interface FeedbackRecord {
  id: string;
  officeId: string;
  rating: number;
  essay: string;
  createdAt: string;
}

const VALID_OFFICE_IDS = new Set([
  'cba',
  'cte',
  'cn',
  'chtm',
  'cas',
  'ccs',
  'ccje',
  'coe',
  'gs',
  'cashier',
  'registrar',
  'university-enterprises',
  'assessment',
]);

// On a host, point DATA_DIR at a persistent disk so feedback survives restarts.
const DATA_DIR = path.resolve(process.env.DATA_DIR ?? path.join(process.cwd(), 'data'));
const DATA_FILE = path.join(DATA_DIR, 'feedback.json');
const PORT = Number(process.env.PORT) || 3000;

// ---------------------------------------------------------------------------
// Admin authentication
// ---------------------------------------------------------------------------
// Set ADMIN_PASSWORD in your environment (.env.local or hosting secrets).
// Sign-in issues a random bearer token that is kept in server memory, so all
// admin sessions end when the server restarts.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const MAX_LOGIN_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

const sessions = new Map<string, number>(); // token -> expiry timestamp
const loginFailures = new Map<string, { count: number; resetAt: number }>();

function sha256(value: string): Buffer {
  return crypto.createHash('sha256').update(value).digest();
}

function passwordMatches(candidate: string): boolean {
  if (!ADMIN_PASSWORD) return false;
  // Hash both sides so lengths match, then compare in constant time.
  return crypto.timingSafeEqual(sha256(candidate), sha256(ADMIN_PASSWORD));
}

function purgeExpiredSessions(): void {
  const now = Date.now();
  for (const [token, expiresAt] of sessions) {
    if (expiresAt <= now) sessions.delete(token);
  }
}

function getBearerToken(req: Request): string | null {
  const header = req.get('authorization');
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token || null;
}

function isValidSession(token: string | null): boolean {
  if (!token) return false;
  const expiresAt = sessions.get(token);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!isValidSession(getBearerToken(req))) {
    res.status(401).json({ error: 'Admin sign-in required.' });
    return;
  }
  next();
}

function getLockoutSecondsRemaining(ip: string): number {
  const record = loginFailures.get(ip);
  if (!record) return 0;
  if (record.resetAt <= Date.now()) {
    loginFailures.delete(ip);
    return 0;
  }
  return record.count >= MAX_LOGIN_FAILURES
    ? Math.ceil((record.resetAt - Date.now()) / 1000)
    : 0;
}

function registerLoginFailure(ip: string): void {
  const now = Date.now();
  const record = loginFailures.get(ip);
  if (!record || record.resetAt <= now) {
    loginFailures.set(ip, { count: 1, resetAt: now + LOCKOUT_MS });
  } else {
    record.count += 1;
  }
}

async function ensureDataStore(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, '[]', 'utf8');
  }
}

async function readFeedbackList(): Promise<FeedbackRecord[]> {
  await ensureDataStore();
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (item): item is FeedbackRecord =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.id === 'string' &&
        typeof item.officeId === 'string' &&
        VALID_OFFICE_IDS.has(item.officeId) &&
        typeof item.rating === 'number' &&
        item.rating >= 1 &&
        item.rating <= 5 &&
        typeof item.essay === 'string' &&
        typeof item.createdAt === 'string'
    );
  } catch {
    return [];
  }
}

async function writeFeedbackList(entries: FeedbackRecord[]): Promise<void> {
  await ensureDataStore();
  const tempFile = `${DATA_FILE}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(entries, null, 2), 'utf8');
  await fs.rename(tempFile, DATA_FILE);
}

function computeSummaries(entries: FeedbackRecord[]) {
  const summaries: Record<
    string,
    {
      officeId: string;
      count: number;
      averageRating: number;
      distribution: Record<1 | 2 | 3 | 4 | 5, number>;
    }
  > = {};

  for (const officeId of VALID_OFFICE_IDS) {
    summaries[officeId] = {
      officeId,
      count: 0,
      averageRating: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  for (const entry of entries) {
    const summary = summaries[entry.officeId];
    if (!summary) continue;
    summary.count += 1;
    const star = entry.rating as 1 | 2 | 3 | 4 | 5;
    summary.distribution[star] = (summary.distribution[star] ?? 0) + 1;
  }

  for (const summary of Object.values(summaries)) {
    if (summary.count > 0) {
      const total =
        summary.distribution[1] * 1 +
        summary.distribution[2] * 2 +
        summary.distribution[3] * 3 +
        summary.distribution[4] * 4 +
        summary.distribution[5] * 5;
      summary.averageRating = Number((total / summary.count).toFixed(2));
    }
  }

  return summaries;
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '64kb' }));

  app.post('/api/admin/login', async (req, res) => {
    if (!ADMIN_PASSWORD) {
      res.status(503).json({
        error: 'Admin sign-in is not configured. Set ADMIN_PASSWORD on the server.',
      });
      return;
    }

    const ip = req.ip ?? 'unknown';
    const lockedFor = getLockoutSecondsRemaining(ip);
    if (lockedFor > 0) {
      res.status(429).json({
        error: `Too many failed attempts. Try again in ${Math.ceil(lockedFor / 60)} minute(s).`,
      });
      return;
    }

    const { password } = req.body ?? {};
    if (typeof password !== 'string' || !passwordMatches(password)) {
      registerLoginFailure(ip);
      // Small delay slows down automated guessing.
      await new Promise((resolve) => setTimeout(resolve, 400));
      res.status(401).json({ error: 'Incorrect password.' });
      return;
    }

    loginFailures.delete(ip);
    purgeExpiredSessions();
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, Date.now() + SESSION_TTL_MS);
    res.json({ token, expiresInMs: SESSION_TTL_MS });
  });

  app.get('/api/admin/session', (req, res) => {
    res.json({ authenticated: isValidSession(getBearerToken(req)) });
  });

  app.post('/api/admin/logout', (req, res) => {
    const token = getBearerToken(req);
    if (token) sessions.delete(token);
    res.json({ authenticated: false });
  });

  app.get('/api/feedback', requireAdmin, async (_req, res) => {
    try {
      const entries = await readFeedbackList();
      const sorted = [...entries].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      res.json({
        entries: sorted,
        summaries: computeSummaries(sorted),
      });
    } catch (error) {
      console.error('Failed to read feedback:', error);
      res.status(500).json({ error: 'Unable to load feedback records.' });
    }
  });

  app.post('/api/feedback', async (req, res) => {
    try {
      const { officeId, rating, essay } = req.body ?? {};

      if (typeof officeId !== 'string' || !VALID_OFFICE_IDS.has(officeId)) {
        res.status(400).json({ error: 'Please select a valid campus office or department.' });
        return;
      }

      const numericRating = Number(rating);
      if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
        res.status(400).json({ error: 'Please select a star rating from 1 to 5.' });
        return;
      }

      if (typeof essay !== 'string') {
        res.status(400).json({ error: 'Please write your essay feedback.' });
        return;
      }

      const trimmedEssay = essay.trim();
      if (trimmedEssay.length < 15) {
        res.status(400).json({ error: 'Essay feedback must be at least 15 characters long.' });
        return;
      }
      if (trimmedEssay.length > 4000) {
        res.status(400).json({ error: 'Essay feedback cannot exceed 4,000 characters.' });
        return;
      }

      const newEntry: FeedbackRecord = {
        id: crypto.randomUUID(),
        officeId,
        rating: numericRating,
        essay: trimmedEssay,
        createdAt: new Date().toISOString(),
      };

      const existing = await readFeedbackList();
      const updated = [newEntry, ...existing];
      await writeFeedbackList(updated);

      // Students only get a confirmation; ratings and essays are visible to admins only.
      res.status(201).json({ success: true });
    } catch (error) {
      console.error('Failed to save feedback:', error);
      res.status(500).json({ error: 'Unable to save your feedback right now.' });
    }
  });

  app.delete('/api/feedback/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await readFeedbackList();
      const filtered = existing.filter((item) => item.id !== id);
      if (filtered.length === existing.length) {
        res.status(404).json({ error: 'Feedback entry not found.' });
        return;
      }
      await writeFeedbackList(filtered);
      res.json({
        deletedId: id,
        summaries: computeSummaries(filtered),
      });
    } catch (error) {
      console.error('Failed to delete feedback:', error);
      res.status(500).json({ error: 'Unable to delete feedback entry.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  if (!ADMIN_PASSWORD) {
    console.warn(
      'ADMIN_PASSWORD is not set: admin sign-in is disabled and feedback cannot be deleted.'
    );
  } else if (ADMIN_PASSWORD.length < 10) {
    console.warn('ADMIN_PASSWORD is short. Use at least 10 characters.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FCUFeedback&concerns server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
