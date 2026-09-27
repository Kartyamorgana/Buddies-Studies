// src/components/stem/StemPomodoro.tsx
import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

type Phase = "focus" | "break";

const FOCUS_SEC = 25 * 60;
const BREAK_SEC = 5 * 60;

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

/**
 * Pomodoro ringan: 25 menit fokus / 5 menit istirahat.
 * State disimpan di memori saja (tidak persist) — refresh akan reset.
 */
export function StemPomodoro() {
  const [phase, setPhase] = useState<Phase>("focus");
  const [remaining, setRemaining] = useState(FOCUS_SEC);
  const [running, setRunning] = useState(false);
  const completedRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((v) => {
        if (v > 1) return v - 1;
        // Selesai fase
        if (phase === "focus") {
          completedRef.current += 1;
          toast.success("🎉 Sesi fokus selesai — istirahat 5 menit", {
            description: `Total sesi hari ini: ${completedRef.current}`,
          });
          setPhase("break");
          return BREAK_SEC;
        } else {
          toast.info("⏰ Istirahat selesai — lanjut fokus");
          setPhase("focus");
          return FOCUS_SEC;
        }
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, phase]);

  const reset = () => {
    setRunning(false);
    setPhase("focus");
    setRemaining(FOCUS_SEC);
  };

  const progress = phase === "focus"
    ? ((FOCUS_SEC - remaining) / FOCUS_SEC) * 100
    : ((BREAK_SEC - remaining) / BREAK_SEC) * 100;

  const accent = phase === "focus" ? "text-primary" : "text-emerald-600 dark:text-emerald-400";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className={`h-8 gap-1.5 ${running ? accent : ""}`}
          title="Pomodoro timer"
        >
          <Timer className="w-4 h-4" />
          <span className="hidden sm:inline text-xs tabular-nums font-mono">
            {fmt(remaining)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {phase === "focus" ? "🎯 Fokus" : "☕ Istirahat"}
          </div>
          <span className={`text-xs font-medium ${accent}`}>
            {running ? "Berjalan" : "Jeda"}
          </span>
        </div>

        <div className={`text-4xl font-bold tabular-nums font-mono text-center ${accent}`}>
          {fmt(remaining)}
        </div>

        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full transition-[width] duration-500 ${phase === "focus" ? "bg-primary" : "bg-emerald-500"}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex gap-1.5">
          <Button
            size="sm"
            onClick={() => setRunning((r) => !r)}
            className="flex-1 gap-1 h-8 text-xs"
          >
            {running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {running ? "Jeda" : "Mulai"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={reset}
            className="h-8 px-2"
            title="Reset ke 25 menit"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center leading-snug">
          25 menit fokus → 5 menit istirahat. Sesi selesai: <b>{completedRef.current}</b>
        </p>
      </PopoverContent>
    </Popover>
  );
}