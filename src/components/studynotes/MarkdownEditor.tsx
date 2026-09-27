import { Bold, Italic, Heading1, Heading2, Link as LinkIcon, List, ListOrdered, Code2, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCallback, useEffect, useRef, useState } from "react";

const LANGS = ["javascript", "typescript", "tsx", "python", "java", "go", "rust", "c", "cpp", "csharp", "ruby", "php", "html", "css", "json", "bash", "sql", "yaml", "markdown"];

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSave?: () => void;
};

export function MarkdownEditor({ value: incoming, onChange: emit, onSave }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [lang, setLang] = useState("javascript");

  // Teks diketik disimpan lokal supaya setiap ketikan tidak me-render ulang
  // seluruh halaman (daftar catatan, preview, dsb). Perubahan diteruskan
  // ke induk dengan jeda singkat.
  const [value, setValue] = useState(incoming);
  const valueRef = useRef(incoming);
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sinkronkan bila isi diganti dari luar (ganti catatan, hasil AI, dll).
  useEffect(() => {
    if (dirtyRef.current) return;
    if (incoming === valueRef.current) return;
    valueRef.current = incoming;
    setValue(incoming);
  }, [incoming]);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    emit(valueRef.current);
  }, [emit]);

  const onChange = useCallback(
    (next: string) => {
      valueRef.current = next;
      dirtyRef.current = true;
      setValue(next);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, 180);
    },
    [flush],
  );

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);


  const wrap = (before: string, after = before, placeholder = "") => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + before + sel + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + sel.length);
    });
  };

  const insertLine = (prefix: string) => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length);
    });
  };

  const insertCodeBlock = () => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = value.slice(start, end) || "// code here";
    const block = `\n\`\`\`${lang}\n${sel}\n\`\`\`\n`;
    const next = value.slice(0, start) + block + value.slice(end);
    onChange(next);
  };

  const insertLink = () => {
    const url = window.prompt("URL", "https://");
    if (!url) return;
    wrap("[", `](${url})`, "link text");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-border bg-card">
        <ToolBtn onClick={() => wrap("**", "**", "bold")} title="Bold (Ctrl+B)">
          <Bold className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => wrap("*", "*", "italic")} title="Italic">
          <Italic className="w-4 h-4" />
        </ToolBtn>
        <div className="w-px h-5 bg-border mx-1" />
        <ToolBtn onClick={() => insertLine("# ")} title="H1">
          <Heading1 className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => insertLine("## ")} title="H2">
          <Heading2 className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => insertLine("> ")} title="Quote">
          <Quote className="w-4 h-4" />
        </ToolBtn>
        <div className="w-px h-5 bg-border mx-1" />
        <ToolBtn onClick={() => insertLine("- ")} title="List">
          <List className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => insertLine("1. ")} title="Ordered list">
          <ListOrdered className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={insertLink} title="Link">
          <LinkIcon className="w-4 h-4" />
        </ToolBtn>
        <div className="w-px h-5 bg-border mx-1" />
        <Select value={lang} onValueChange={setLang}>
          <SelectTrigger className="h-7 w-[120px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGS.map((l) => (
              <SelectItem key={l} value={l} className="text-xs">
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="secondary" onClick={insertCodeBlock} className="h-7 px-2 text-xs gap-1">
          <Code2 className="w-3.5 h-3.5" /> Code block
        </Button>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
            e.preventDefault();
            wrap("**", "**", "bold");
          }
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
            e.preventDefault();
            wrap("*", "*", "italic");
          }
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
            e.preventDefault();
            flush();
            onSave?.();
          }
        }}
        onBlur={flush}
        spellCheck={false}
        aria-label="Editor catatan Markdown"
        className="flex-1 w-full resize-none bg-background text-foreground p-4 font-mono text-sm leading-relaxed outline-none border-0"
        placeholder="Tulis catatan dalam Markdown..."
      />

    </div>
  );
}

function ToolBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      type="button"
      aria-label={title}
      className="h-9 w-9 sm:h-7 sm:w-7 inline-flex items-center justify-center rounded hover:bg-accent text-foreground/80"

    >
      {children}
    </button>
  );
}
