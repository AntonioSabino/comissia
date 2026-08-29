import { describe, expect, it } from "vitest";
import { FixedWindowRateLimiter } from "./fixed-window-rate-limiter";

describe("FixedWindowRateLimiter", () => {
  it("blocks attempts above the configured limit", () => {
    const limiter = new FixedWindowRateLimiter({
      maxAttempts: 2,
      windowMs: 60_000,
    });

    expect(limiter.consume("account", 1_000).allowed).toBe(true);
    expect(limiter.consume("account", 2_000).allowed).toBe(true);
    expect(limiter.consume("account", 3_000)).toEqual({
      allowed: false,
      retryAfterSeconds: 58,
    });
  });

  it("opens a new window after the previous one expires", () => {
    const limiter = new FixedWindowRateLimiter({
      maxAttempts: 1,
      windowMs: 60_000,
    });

    limiter.consume("account", 1_000);

    expect(limiter.consume("account", 61_000).allowed).toBe(true);
  });

  it("allows attempts again after a successful login resets the account", () => {
    const limiter = new FixedWindowRateLimiter({
      maxAttempts: 1,
      windowMs: 60_000,
    });

    limiter.consume("account", 1_000);
    limiter.reset("account");

    expect(limiter.consume("account", 2_000).allowed).toBe(true);
  });
});
