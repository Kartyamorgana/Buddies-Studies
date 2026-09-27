import { Link, useMatchRoute } from "@tanstack/react-router";
import {
  BookOpen,
  CalendarCheck,
  FlaskConical,
  Hand,
  Headphones,
  LineChart,
  Mic,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";


type NavKey =
  | "/"
  | "/stem"
  | "/auditory"
  | "/kinesthetic"
  | "/predictor"
  | "/planner"
  | "/lecture";

const ITEMS: { to: NavKey; label: string; short: string; icon: typeof BookOpen }[] = [
  { to: "/", label: "Notes", short: "Notes", icon: BookOpen },
  { to: "/stem", label: "STEM & SNBT", short: "STEM", icon: FlaskConical },
  { to: "/auditory", label: "Auditory", short: "Audio", icon: Headphones },
  { to: "/kinesthetic", label: "Kinesthetic", short: "Gerak", icon: Hand },
  { to: "/predictor", label: "Prediksi Skor", short: "Skor", icon: LineChart },
  { to: "/planner", label: "Rencana Belajar", short: "Rencana", icon: CalendarCheck },
  { to: "/lecture", label: "Transkrip Kuliah", short: "Rekam", icon: Mic },
];

/**
 * Navigasi utama 4 bagian: Notes, STEM & SNBT, Auditory Studio, Kinesthetic Lab.
 */
export function StemTopNav({
  className,
  size = "compact",
}: {
  className?: string;
  size?: "compact" | "comfortable";
}) {
  const matchRoute = useMatchRoute();
  const listRef = useRef<HTMLDivElement>(null);

  const active: NavKey =
    (["/stem", "/auditory", "/kinesthetic", "/predictor", "/planner", "/lecture"] as const).find(
      (p) => matchRoute({ to: p, fuzzy: true }),
    ) ?? "/";

  // Pastikan menu yang sedang aktif terlihat saat baris menu digeser.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [active]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const links = Array.from(
      listRef.current?.querySelectorAll<HTMLAnchorElement>("a[role=tab]") ?? [],
    );
    const i = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (i < 0) return;
    e.preventDefault();
    const next = e.key === "ArrowRight" ? (i + 1) % links.length : (i - 1 + links.length) % links.length;
    links[next]?.focus();
  };

  const itemBase =
    size === "comfortable"
      ? "inline-flex h-9 w-full min-w-0 items-center justify-center gap-1 overflow-hidden rounded-md px-2 text-[11px] font-medium leading-none whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      : "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const activeCls = "bg-background text-foreground shadow-sm";
  const inactiveCls = "text-muted-foreground hover:text-foreground";

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Navigasi utama"
      onKeyDown={onKeyDown}
      className={cn(
        "rounded-lg bg-muted p-0.5",
        size === "comfortable"
          ? "grid w-full grid-cols-2 gap-0.5"
          : "flex min-w-0 max-w-full items-center overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {ITEMS.map((it) => {
        const Icon = it.icon;
        const on = active === it.to;
        return (
          <Link
            key={it.to}
            to={it.to}
            role="tab"
            aria-selected={on}
            aria-current={on ? "page" : undefined}
            title={it.label}
            className={cn(itemBase, on ? activeCls : inactiveCls)}
          >
            <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className={size === "comfortable" ? "truncate" : "hidden lg:inline"}>
              {it.label}
            </span>
            {size !== "comfortable" && <span className="lg:hidden">{it.short}</span>}
          </Link>
        );
      })}
    </div>
  );
}

