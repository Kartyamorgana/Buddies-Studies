import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export const POMODORO_PRESETS = [
  { id: "classic", label: "Klasik", focus: 25, short: 5, long: 15 },
  { id: "deep", label: "Deep work", focus: 50, short: 10, long: 20 },
  { id: "sprint", label: "Sprint", focus: 15, short: 3, long: 10 },
] as const;

export type PomodoroPresetId = (typeof POMODORO_PRESETS)[number]["id"];
export type PomodoroPhase = "focus" | "short" | "long";

type Ctx = {
  presetId: PomodoroPresetId;
  setPresetId: (id: PomodoroPresetId) => void;
  preset: (typeof POMODORO_PRESETS)[number];
  phase: PomodoroPhase;
  left: number;
  total: number;
  running: boolean;
  done: number;
  toggle: () => void;
  reset: (phase?: PomodoroPhase) => void;
  switchPhase: () => void;
  phaseLabel: string;
  mmss: string;
};

const PomodoroContext = createContext<Ctx | null>(null);
const STORE_KEY = "studynotes-pomodoro-global";

function minutesFor(preset: (typeof POMODORO_PRESETS)[number], phase: PomodoroPhase) {
  return phase === "focus" ? preset.focus : phase === "short" ? preset.short : preset.long;
}

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const [presetId, setPresetIdRaw] = useState<PomodoroPresetId>("classic");
  const preset = POMODORO_PRESETS.find((p) => p.id === presetId)!;
  const [phase, setPhase] = useState<PomodoroPhase>("focus");
  const [left, setLeft] = useState(preset.focus * 60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const endsAt = useRef<number | null>(null);
  const hydrated = useRef(false);

  // muat state terakhir; timer tetap "berjalan" meski pindah halaman/refresh
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const d = JSON.parse(raw) as {
          presetId?: PomodoroPresetId;
          phase?: PomodoroPhase;
          left?: number;
          running?: boolean;
          done?: number;
          endsAt?: number | null;
        };
        const p = POMODORO_PRESETS.find((x) => x.id === d.presetId) ?? preset;
        setPresetIdRaw(p.id);
        setPhase(d.phase ?? "focus");
        setDone(d.done ?? 0);
        if (d.running && d.endsAt) {
          const remain = Math.round((d.endsAt - Date.now()) / 1000);
          if (remain > 0) {
            endsAt.current = d.endsAt;
            setLeft(remain);
            setRunning(true);
          } else {
            setLeft(minutesFor(p, d.phase ?? "focus") * 60);
          }
        } else {
          setLeft(d.left ?? minutesFor(p, d.phase ?? "focus") * 60);
        }
      }
    } catch {
      /* ignore */
    }
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({ presetId, phase, left, running, done, endsAt: endsAt.current }),
    );
  }, [presetId, phase, left, running, done]);

  const total = minutesFor(preset, phase) * 60;

  const reset = useCallback(
    (p?: PomodoroPhase) => {
      const next = p ?? phase;
      endsAt.current = null;
      setRunning(false);
      setPhase(next);
      setLeft(minutesFor(preset, next) * 60);
    },
    [phase, preset],
  );

  const setPresetId = useCallback((id: PomodoroPresetId) => {
    const p = POMODORO_PRESETS.find((x) => x.id === id)!;
    endsAt.current = null;
    setPresetIdRaw(id);
    setRunning(false);
    setPhase("focus");
    setLeft(p.focus * 60);
  }, []);

  const toggle = useCallback(() => {
    setRunning((v) => {
      if (v) {
        endsAt.current = null;
        return false;
      }
      endsAt.current = Date.now() + left * 1000;
      return true;
    });
  }, [left]);

  const switchPhase = useCallback(() => {
    reset(phase === "focus" ? "short" : "focus");
  }, [phase, reset]);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const remain = endsAt.current ? Math.round((endsAt.current - Date.now()) / 1000) : 0;
      if (remain > 0) {
        setLeft(remain);
        return;
      }
      endsAt.current = null;
      setRunning(false);
      setLeft(0);
      if (phase === "focus") {
        const nd = done + 1;
        setDone(nd);
        const nextPhase: PomodoroPhase = nd % 4 === 0 ? "long" : "short";
        setPhase(nextPhase);
        setLeft(minutesFor(preset, nextPhase) * 60);
      } else {
        setPhase("focus");
        setLeft(preset.focus * 60);
      }
    };
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [running, phase, preset, done]);

  const value = useMemo<Ctx>(() => {
    const mm = String(Math.floor(left / 60)).padStart(2, "0");
    const ss = String(left % 60).padStart(2, "0");
    return {
      presetId,
      setPresetId,
      preset,
      phase,
      left,
      total,
      running,
      done,
      toggle,
      reset,
      switchPhase,
      phaseLabel:
        phase === "focus" ? "Fokus" : phase === "short" ? "Istirahat singkat" : "Istirahat panjang",
      mmss: `${mm}:${ss}`,
    };
  }, [presetId, setPresetId, preset, phase, left, total, running, done, toggle, reset, switchPhase]);

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}

export function usePomodoro() {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error("usePomodoro harus dipakai di dalam PomodoroProvider");
  return ctx;
}
