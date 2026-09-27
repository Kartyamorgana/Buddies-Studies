// src/components/common/LatexRenderer.tsx
import { useMemo } from "react";
import katex from "katex";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { LatexErrorBoundary, LatexFallback } from "./LatexErrorBoundary";
import {
  KATEX_OPTIONS,
  normalizeMath,
  stripMathDelimiters,
} from "@/lib/latex";

/* -------------------------------------------------------------------------- */
/*  LatexInline — 1 rumus, displayMode: false                                 */
/* -------------------------------------------------------------------------- */

export function LatexInline({
  latex,
  className,
}: {
  latex: string;
  className?: string;
}) {
  const inner = useMemo(() => stripMathDelimiters(latex), [latex]);

  const html = useMemo(() => {
    try {
      return katex.renderToString(inner, { ...KATEX_OPTIONS, displayMode: false });
    } catch {
      return null;
    }
  }, [inner]);

  if (!html) return <LatexFallback latex={inner} />;

  return (
    <LatexErrorBoundary fallback={() => <LatexFallback latex={inner} />}>
      <span
        className={className}
        // Aman: `inner` telah melalui KaTeX (sanitasi internal, tanpa \htmlClass/\href berbahaya).
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </LatexErrorBoundary>
  );
}

/* -------------------------------------------------------------------------- */
/*  LatexBlock — 1 rumus, displayMode: true (tengah, ada margin vertikal)     */
/* -------------------------------------------------------------------------- */

export function LatexBlock({
  latex,
  className,
}: {
  latex: string;
  className?: string;
}) {
  const inner = useMemo(() => stripMathDelimiters(latex), [latex]);

  const html = useMemo(() => {
    try {
      return katex.renderToString(inner, { ...KATEX_OPTIONS, displayMode: true });
    } catch {
      return null;
    }
  }, [inner]);

  if (!html) return <LatexFallback latex={inner} />;

  return (
    <LatexErrorBoundary fallback={() => <LatexFallback latex={inner} />}>
      <div
        className={className ?? "my-3 overflow-x-auto text-center"}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </LatexErrorBoundary>
  );
}

/* -------------------------------------------------------------------------- */
/*  MathText — teks bebas dengan $...$ / $$...$$                              */
/*  Pipeline identik dengan MarkdownPreview (remark-math + rehype-katex).     */
/* -------------------------------------------------------------------------- */

export function MathText({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const normalized = useMemo(() => normalizeMath(children), [children]);

  // Teks tanpa rumus / markup tidak perlu melewati parser berat.
  const plain = useMemo(() => !/[$\\_^*`~[\]<>|]/.test(normalized), [normalized]);
  if (plain) return <span className={className}>{normalized}</span>;



  return (
    <LatexErrorBoundary fallback={() => <span className={className}>{children}</span>}>
      <span className={className}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[[rehypeKatex, KATEX_OPTIONS]]}
          // Hilangkan <p> pembungkus agar aman di-inline dalam <span>/<li>/badge.
          components={{
            p: ({ children }) => <>{children}</>,
          }}
        >
          {normalized}
        </ReactMarkdown>
      </span>
    </LatexErrorBoundary>
  );
}