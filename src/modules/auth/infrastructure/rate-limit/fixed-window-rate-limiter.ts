type RateLimitEntry = {
  attempts: number;
  resetAt: number;
};

type RateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
};

type FixedWindowRateLimiterOptions = {
  maxAttempts: number;
  windowMs: number;
  maxEntries?: number;
};

export class FixedWindowRateLimiter {
  private readonly entries = new Map<string, RateLimitEntry>();
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly maxEntries: number;

  constructor({
    maxAttempts,
    windowMs,
    maxEntries = 10_000,
  }: FixedWindowRateLimiterOptions) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.maxEntries = maxEntries;
  }

  consume(key: string, now = Date.now()): RateLimitDecision {
    const current = this.entries.get(key);

    if (!current || current.resetAt <= now) {
      this.addEntry(key, { attempts: 1, resetAt: now + this.windowMs });

      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (current.attempts >= this.maxAttempts) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((current.resetAt - now) / 1_000),
        ),
      };
    }

    current.attempts += 1;

    return { allowed: true, retryAfterSeconds: 0 };
  }

  reset(key: string): void {
    this.entries.delete(key);
  }

  private addEntry(key: string, entry: RateLimitEntry): void {
    if (!this.entries.has(key) && this.entries.size >= this.maxEntries) {
      const oldestKey = this.entries.keys().next().value as string | undefined;

      if (oldestKey) {
        this.entries.delete(oldestKey);
      }
    }

    this.entries.set(key, entry);
  }
}
