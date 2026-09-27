// src/components/studynotes/MarkdownPreview.tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import {
  cloneElement,
  isValidElement,
  memo,
  useCallback,
  useDeferredValue,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { Link } from "@tanstack/react-router";
import {
  Copy,
  Check,
  Info,
  Lightbulb,
  AlertTriangle,
  Flame,
  Star,
  Clock,
  FileText,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  CodeBlock                                                                 */
/* -------------------------------------------------------------------------- */

function CodeBlock({ className, children }: { className?: string; children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const lang = (className ?? "").replace("language-", "").replace("hljs", "").trim() || "text";
  const text = String(Array.isArray(children) ? children.join("") : children ?? "");
  const onCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);
  return (
    <div className="code-block">
      <div className="code-block-header">
        <span>{lang}</span>
        <button className="copy-btn" onClick={onCopy} type="button">
          {copied ? <Check className="inline w-3 h-3 mr-1" /> : <Copy className="inline w-3 h-3 mr-1" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Callouts (+ DETAILS)                                                      */
/* -------------------------------------------------------------------------- */

const CALLOUTS = {
  NOTE: { label: "Catatan", icon: Info, cls: "callout-note" },
  TIP: { label: "Tips", icon: Lightbulb, cls: "callout-tip" },
  IMPORTANT: { label: "Penting", icon: Star, cls: "callout-important" },
  WARNING: { label: "Hati-hati", icon: AlertTriangle, cls: "callout-warning" },
  CAUTION: { label: "Awas", icon: Flame, cls: "callout-caution" },
} as const;

type CalloutKey = keyof typeof CALLOUTS | "DETAILS";

// Regex mendukung `[!TYPE]` dan `[!TYPE] summary` (untuk DETAILS)
const CALLOUT_RE =
  /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|DETAILS)\](?:[ \t]+([^\n]+))?[ \t]*\n?/i;

type ExtractedCallout = {
  key: CalloutKey;
  summary?: string;
  children: ReactNode;
};

/** Anak berupa string kosong/whitespace (mis. "\n" antar blok) harus diabaikan. */
const isBlank = (n: ReactNode) => typeof n === "string" && n.trim() === "";

function extractCallout(children: ReactNode): ExtractedCallout | null {
  const arr = Array.isArray(children) ? children : [children];
  // react-markdown menyisipkan node "\n" antar blok — lewati dulu.
  const idx = arr.findIndex((c) => !isBlank(c));
  if (idx === -1) return null;
  const first = arr[idx];
  const before = arr.slice(0, idx);
  const after = arr.slice(idx + 1);

  // Kasus A: anak pertama string mentah
  if (typeof first === "string") {
    const m = first.match(CALLOUT_RE);
    if (!m) return null;
    const key = m[1]!.toUpperCase() as CalloutKey;
    const summary = m[2]?.trim();
    const rest = first.slice(m[0].length);
    const remaining = rest.trim() ? [rest, ...after] : after;
    return { key, summary, children: remaining.length === 1 ? remaining[0] : remaining };
  }

  // Kasus B: anak pertama elemen (biasanya <p>)
  if (isValidElement(first)) {
    const el = first as { props?: { children?: ReactNode } };
    const inner = el.props?.children;
    const innerArr = Array.isArray(inner) ? inner : [inner];
    const innerIdx = innerArr.findIndex((c) => !isBlank(c));
    const firstInner = innerIdx === -1 ? undefined : innerArr[innerIdx];
    if (typeof firstInner !== "string") return null;

    const m = firstInner.match(CALLOUT_RE);
    if (!m) return null;

    const key = m[1]!.toUpperCase() as CalloutKey;
    const summary = m[2]?.trim();
    const restText = firstInner.slice(m[0].length);
    const tailInner = innerArr.slice(innerIdx + 1);
    const newInnerArr = restText.trim() ? [restText, ...tailInner] : tailInner;

    const hasInnerContent = newInnerArr.some((c) => !isBlank(c));
    const clonedFirst = hasInnerContent
      ? cloneElement(first as React.ReactElement, {}, ...(newInnerArr as ReactNode[]))
      : null;
    const newChildren = [...before, ...(clonedFirst ? [clonedFirst] : []), ...after];
    return {
      key,
      summary,
      children: newChildren.length === 1 ? newChildren[0] : newChildren,
    };
  }

  return null;
}

function Blockquote({ children }: { children?: ReactNode }) {
  const callout = extractCallout(children);
  if (!callout) return <blockquote>{children}</blockquote>;

  // DETAILS dirender sebagai <details> HTML murni, bukan callout visual
  if (callout.key === "DETAILS") {
    return (
      <details>
        <summary>{callout.summary || "Jawaban"}</summary>
        <div>{callout.children}</div>
      </details>
    );
  }

  const meta = CALLOUTS[callout.key as keyof typeof CALLOUTS];
  if (!meta) return <blockquote>{children}</blockquote>;
  const Icon = meta.icon;
  return (
    <div className={`callout ${meta.cls}`}>
      <div className="callout-title">
        <Icon className="w-4 h-4" />
        {meta.label}
      </div>
      <div className="callout-body">{callout.children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Symbol map & MATHY                                                        */
/* -------------------------------------------------------------------------- */

const SYMBOLS: Record<string, string> = {
  rightarrow: "→",
  Rightarrow: "⇒",
  leftarrow: "←",
  Leftarrow: "⇐",
  leftrightarrow: "↔",
  to: "→",
  times: "×",
  cdot: "·",
  approx: "≈",
  neq: "≠",
  leq: "≤",
  geq: "≥",
  pm: "±",
  infty: "∞",
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  Delta: "Δ",
  theta: "θ",
  lambda: "λ",
  mu: "μ",
  pi: "π",
  sigma: "σ",
  Sigma: "Σ",
  omega: "ω",
  Omega: "Ω",
};

const MATHY =
  /^(frac|dfrac|tfrac|sqrt|sum|prod|int|iint|oint|lim|binom|vec|hat|bar|tilde|overline|underline|overrightarrow|mathrm|mathbf|mathbb|mathcal|operatorname|log|ln|exp|sin|cos|tan|sec|csc|cot|partial|nabla|cdots|ldots|dots|begin|end|left|right|substack|matrix|pmatrix|bmatrix|cases|align|aligned|text)$/;

/* -------------------------------------------------------------------------- */
/*  convertDetailsToCallout — inti fix                                        */
/* -------------------------------------------------------------------------- */

/**
 * Konversi `<details><summary>S</summary>C</details>` menjadi blockquote
 * dengan marker `[!DETAILS] S`, agar konten di dalamnya tetap diparsing
 * sebagai markdown (termasuk rumus $...$ dan $$...$$).
 *
 * Ini menyelesaikan bug: CommonMark memperlakukan HTML `<details>` sebagai
 * raw block, sehingga konten di dalamnya TIDAK diparsing sebagai markdown.
 */
function convertDetailsToCallout(src: string): string {
  return src.replace(
    /^[ \t]*<details\b[^>]*>([\s\S]*?)<\/details>[ \t]*$/gim,
    (_match, inner: string) => {
      const sm = inner.match(
        /^\s*<summary\b[^>]*>([\s\S]*?)<\/summary>([\s\S]*)$/i,
      );
      const summary = (sm ? sm[1] : "Jawaban").trim();
      const content = (sm ? sm[2] : inner).trim();

      const contentLines = content.split("\n");
      const quoted = [
        `> [!DETAILS] ${summary}`,
        ">",
        ...contentLines.map((l) => (l.trim() ? `> ${l}` : ">")),
      ];
      return `\n${quoted.join("\n")}\n`;
    },
  );
}

/* -------------------------------------------------------------------------- */
/*  normalizeMath                                                             */
/* -------------------------------------------------------------------------- */

export function normalizeMath(src: string): string {
  // 0a. Normalisasi line ending
  let out = src.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 0b. Konversi <details> HTML → blockquote marker
  out = convertDetailsToCallout(out);

  // 1. \[ ... \] → $$ ... $$ ; \( ... \) → $ ... $
  out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_m, inner) => `\n$$\n${String(inner).trim()}\n$$\n`);
  out = out.replace(/\\\(([\s\S]*?)\\\)/g, (_m, inner) => `$${String(inner).trim()}$`);

  const protect = (s: string) =>
    s.split(/(\$\$[\s\S]*?\$\$|\$[^$]{1,500}?\$|`[^`]*`|```[\s\S]*?```)/g);

  // 2. \begin{env}...\end{env} di luar math → blok $$
  out = protect(out)
    .map((seg, i) =>
      i % 2 === 1
        ? seg
        : seg.replace(
            /\\begin\{(equation\*?|align\*?|aligned|gather\*?|cases|array|[pbvB]?matrix)\}([\s\S]*?)\\end\{\1\}/g,
            (_m, env: string, body: string) =>
              env.startsWith("equation")
                ? `\n$$\n${body.trim()}\n$$\n`
                : `\n$$\n\\begin{${env}}${body}\\end{${env}}\n$$\n`,
          ),
    )
    .join("");

  // 3. Perintah math tanpa pembatas $
  out = protect(out)
    .map((seg, i) => {
      if (i % 2 === 1) return seg;
      return seg.replace(
        /\\[A-Za-z]+(?:\s*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|\[[^\]\n]*\]|[_^]\{[^{}]*\}|[_^][A-Za-z0-9]))+/g,
        (m) => {
          const name = /^\\([A-Za-z]+)/.exec(m)?.[1] ?? "";
          if (!MATHY.test(name)) return m;
          return `$${m.trim()}$`;
        },
      );
    })
    .join("");

  // 4. Perintah LaTeX berdiri sendiri → simbol unicode
  return protect(out)
    .map((seg, i) => {
      if (i % 2 === 1) return seg;
      return seg.replace(/\\([A-Za-z]+)/g, (m, name: string) => SYMBOLS[name] ?? m);
    })
    .join("");
}

/* -------------------------------------------------------------------------- */
/*  MarkdownPreview                                                           */
/* -------------------------------------------------------------------------- */

export function MarkdownPreview({ source }: { source: string }) {
  // Render berat (Markdown + rumus + kode) ditunda sedikit agar mengetik tetap mulus.
  const deferred = useDeferredValue(source);
  return <MarkdownPreviewInner source={deferred} />;
}

const MarkdownPreviewInner = memo(function MarkdownPreviewInner({ source }: { source: string }) {
  const stats = useMemo(() => {
    const words = source.trim() ? source.trim().split(/\s+/).length : 0;
    return { words, minutes: Math.max(1, Math.round(words / 200)) };
  }, [source]);

  const body = useMemo(
    () => (source ? normalizeMath(source) : "*Start writing to see the preview...*"),
    [source],
  );

  return (
    <div className="prose-note">

      {stats.words > 120 && (
        <div className="note-meta">
          <span>
            <FileText className="w-3.5 h-3.5" /> {stats.words.toLocaleString("id-ID")} kata
          </span>
          <span>
            <Clock className="w-3.5 h-3.5" /> ±{stats.minutes} menit baca
          </span>
        </div>
      )}
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          rehypeRaw,
          [rehypeKatex, { throwOnError: false, strict: false }],
          rehypeHighlight,
        ]}
        components={{
          blockquote: ({ children }) => <Blockquote>{children}</Blockquote>,
          pre: ({ children }) => <>{children}</>,
          a: ({ href, children, ...rest }) => {
            const isInternal = typeof href === "string" && href.startsWith("/");
            if (isInternal) {
              return (
                <Link
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  to={href as any}
                  className="text-primary underline underline-offset-2 hover:opacity-80 font-medium"
                >
                  {children}
                </Link>
              );
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:opacity-80"
                {...rest}
              >
                {children}
              </a>
            );
          },
          code: ({
            className,
            children,
            ...props
          }: {
            className?: string;
            children?: ReactNode;
            node?: unknown;
            inline?: boolean;
          }) => {
            const isBlock = className?.includes("language-");
            if (!isBlock) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
            return <CodeBlock className={className}>{children}</CodeBlock>;
          },
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
});
