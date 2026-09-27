// Cron authentication — verifikasi request dari Cloudflare Cron Trigger
// (atau scheduler manapun) lewat shared secret di header Authorization.
//
// Set secret di Cloudflare:
//   npx wrangler secret put CRON_SECRET
//   npx wrangler secret put CRON_SECRET_PREVIOUS
//
// Nilai CRON_SECRET bisa di-generate bebas, misal: openssl rand -hex 32
// CRON_SECRET_PREVIOUS opsional — dipakai untuk rotasi secret tanpa downtime.

export async function authenticateCronRequest(
  request: Request,
): Promise<Response | null> {
  const currentSecret = process.env["CRON_SECRET"];
  const previousSecret = process.env["CRON_SECRET_PREVIOUS"];

  if (!currentSecret) {
    return new Response("Server configuration error", { status: 500 });
  }

  const match = /^Bearer ([^\s,]+)$/.exec(
    request.headers.get("authorization") ?? "",
  );
  const token = match?.[1];
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { createHash, timingSafeEqual } = await import("node:crypto");
  const digest = (value: string) =>
    createHash("sha256").update(value, "utf8").digest();
  const providedDigest = digest(token);
  const currentMatches = timingSafeEqual(providedDigest, digest(currentSecret));
  const previousMatches = timingSafeEqual(
    providedDigest,
    digest(previousSecret ?? currentSecret),
  );

  if (!currentMatches && !previousMatches) {
    return new Response("Unauthorized", { status: 401 });
  }

  return null;
}