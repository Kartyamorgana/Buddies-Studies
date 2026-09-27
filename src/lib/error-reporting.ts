/**
 * Error reporting minimal — tidak ada dependensi eksternal.
 * Kalau mau pakai Sentry nanti, tinggal ganti isi fungsi ini.
 */
export function reportError(
  error: unknown,
  context: Record<string, unknown> = {},
) {
  if (typeof window === "undefined") return;
  console.error("[AppError]", error, {
    route: window.location.pathname,
    ...context,
  });
}

/**
 * Alias kompatibilitas — dipakai oleh src/routes/__root.tsx.
 * Nama lama dipertahankan agar tidak perlu ubah file lain.
 */
export const reportLovableError = reportError;