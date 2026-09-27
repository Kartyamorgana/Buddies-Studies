import { useState } from "react";
import { Timer, Play, Pause, RotateCcw, X, ChevronUp } from "lucide-react";
import { usePomodoro } from "@/lib/pomodoro";
import { Button } from "@/components/ui/button";

/** Timer belajar yang selalu terlihat, apa pun tab yang sedang dibuka. */
export function FloatingTimer() {
  const { mmss, phaseLabel, running, toggle, reset, left, total, done } = usePomodoro();
  const [open, setOpen] = useState(false);
  const pct = total > 0 ? ((total - left) / total) * 100 : 0;
  const idle = !running && left === total;

  if (idle && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buka timer belajar"
        className="fixed bottom-4 right-4 z-40 h-11 w-11 rounded-full bg-primary text-primary-foreground shadow-lg grid place-items-center transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Timer className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-40 w-[220px] rounded-2xl border border-border bg-card/95 backdrop-blur shadow-xl p-3 animate-fade-in"
      role="region"
      aria-label="Timer belajar"
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Timer className="w-3.5 h-3.5 text-primary" /> {phaseLabel}
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Sembunyikan timer"
          className="p-1 rounded hover:bg-accent text-muted-foreground"
        >
          {running ? <ChevronUp className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
        </button>
      </div>
      <div
        className="text-3xl font-semibold tabular-nums leading-none mb-2"
        role="timer"
        aria-live="off"
        aria-label={`${phaseLabel}, sisa ${mmss}`}
      >
        {mmss}
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2.5">
        <div
          className="h-full bg-primary transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <Button size="sm" onClick={toggle} className="flex-1 h-8 text-xs gap-1">
          {running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {running ? "Jeda" : "Mulai"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => reset()}
          className="h-8 w-8 p-0"
          aria-label="Ulang timer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="text-[11px] text-muted-foreground mt-2">{done} sesi fokus selesai</div>
    </div>
  );
}
