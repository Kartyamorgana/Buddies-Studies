/**
 * Versi mandiri — tidak ada broker Lovable, cukup localStorage biasa.
 * Nama fungsi tetap dipertahankan agar import di client.ts tidak perlu diubah.
 */
export function brokeredPreviewStorage() {
  if (typeof window === "undefined") return undefined;
  return localStorage;
}