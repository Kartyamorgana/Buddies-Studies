// src/components/common/LatexErrorBoundary.tsx
import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback: (error: Error) => ReactNode;
};

type State = { error: Error | null };

/**
 * Error boundary minimal untuk render rumus.
 * Khusus membungkus `katex.renderToString()` langsung (bukan lewat rehype),
 * karena fungsi itu tetap bisa throw walau `throwOnError:false` pada input aneh.
 */
export class LatexErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Jangan crash seluruh halaman — cukup log untuk debugging.
    console.error("[LatexErrorBoundary]", error.message, info.componentStack);
  }

  render() {
    if (this.state.error) return this.props.fallback(this.state.error);
    return this.props.children;
  }
}

/** Fallback kontras tinggi: monospace + aksen amber, ramah dark & light mode. */
export function LatexFallback({ latex }: { latex?: string }) {
  return (
    <span
      role="status"
      aria-label="Rumus tidak dapat dirender"
      className="inline-flex items-baseline gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[0.9em] text-amber-700 dark:text-amber-300"
    >
      <span aria-hidden>⚠</span>
      {latex ? <code className="font-mono break-all">{latex}</code> : <span>rumus gagal dirender</span>}
    </span>
  );
}