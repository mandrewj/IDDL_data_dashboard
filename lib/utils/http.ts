/**
 * GET with retry for transient upstream failures: 429, 5xx, and network-level
 * errors (`TypeError: fetch failed`). iNaturalist occasionally drops a
 * connection mid-pagination, and a single blip used to fail the whole weekly
 * refresh.
 *
 * Honors `Retry-After` (seconds) when present. Other 4xx are returned as-is —
 * they indicate a bad request, not a flaky backend — so callers still check
 * `res.ok`. Only used by scripts/build-data.ts; never at request time.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit & { label: string; backoffSeconds?: number[] }
): Promise<Response> {
  const { label, backoffSeconds = [10, 30, 90], ...fetchInit } = init;
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, fetchInit);
    } catch (err) {
      if (attempt < backoffSeconds.length) {
        console.warn(`  ${label}: ${describe(err)} — retrying in ${backoffSeconds[attempt]}s`);
        await sleep(backoffSeconds[attempt]);
        continue;
      }
      throw new Error(`${label} network error after ${attempt + 1} attempts: ${describe(err)}`);
    }

    const transient = res.status === 429 || res.status >= 500;
    if (!transient || attempt >= backoffSeconds.length) return res;

    const retryAfter = Number(res.headers.get('retry-after'));
    const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : backoffSeconds[attempt];
    console.warn(`  ${label}: HTTP ${res.status} — retrying in ${wait}s`);
    await res.body?.cancel();
    await sleep(wait);
  }
}

/** Undici's "fetch failed" hides the real reason (ECONNRESET, ETIMEDOUT…) in `cause`. */
function describe(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const cause = err.cause as { code?: string; message?: string } | undefined;
  const detail = cause?.code ?? cause?.message;
  return detail ? `${err.message} (${detail})` : err.message;
}

function sleep(seconds: number) {
  return new Promise((r) => setTimeout(r, seconds * 1000));
}
