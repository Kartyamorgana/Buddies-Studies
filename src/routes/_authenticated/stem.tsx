// src/routes/_authenticated/stem.tsx
import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout minimal untuk area /stem.
 * Konten studio ada di `stem.index.tsx` (path "/stem"),
 * analytics di `stem.analytics.tsx` (path "/stem/analytics").
 */
export const Route = createFileRoute("/_authenticated/stem")({
  ssr: false,
  component: () => <Outlet />,
});