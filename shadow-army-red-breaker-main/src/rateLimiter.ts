const RATE_LIMIT_WINDOW = Number(process.env.RATE_LIMIT_WINDOW || 60000);
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 100);

type Bucket = {
  count: number;
  windowStart: number;
};

const buckets = new Map<string, Bucket>();

export function consumeRateLimit(key: string): { allowed: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const bucket = buckets.get(key) || { count: 0, windowStart: now };

  if (now - bucket.windowStart >= RATE_LIMIT_WINDOW) {
    bucket.count = 0;
    bucket.windowStart = now;
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - bucket.count);
  const reset = bucket.windowStart + RATE_LIMIT_WINDOW;

  return {
    allowed: bucket.count <= RATE_LIMIT_MAX_REQUESTS,
    remaining,
    reset
  };
}
