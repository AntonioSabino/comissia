import { FixedWindowRateLimiter } from "./fixed-window-rate-limiter";

const LOGIN_WINDOW_MS = 15 * 60 * 1_000;

export const loginIpRateLimiter = new FixedWindowRateLimiter({
  maxAttempts: 50,
  windowMs: LOGIN_WINDOW_MS,
});

export const loginEmailRateLimiter = new FixedWindowRateLimiter({
  maxAttempts: 5,
  windowMs: LOGIN_WINDOW_MS,
});
