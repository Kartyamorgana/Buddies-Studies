// Mesin estimasi skor UTBK sederhana berbasis Item Response Theory (model 2PL/Rasch).
//
// Ide dasar: setiap soal punya tingkat kesulitan b. Kemampuan peserta (theta)
// diestimasi dengan Newton-Raphson agar peluang jawaban benar model sedekat
// mungkin dengan hasil nyata. Theta lalu dipetakan ke skala UTBK 200-1000.

export type ItemAttempt = {
  /** Tingkat kesulitan soal, -2 (sangat mudah) .. 2 (sangat sulit). */
  difficulty: number;
  correct: boolean;
  /** Bobot (mis. soal terbaru lebih berbobot). */
  weight?: number;
};

export const DIFFICULTY_B: Record<string, number> = {
  easy: -1,
  medium: 0,
  hard: 1,
  hots: 1.8,
};

const DISCRIMINATION = 1.2;

export function pCorrect(theta: number, b: number) {
  return 1 / (1 + Math.exp(-DISCRIMINATION * (theta - b)));
}

/** Estimasi kemampuan (theta) dengan Newton-Raphson + prior normal(0,1). */
export function estimateTheta(items: ItemAttempt[]): number {
  if (!items.length) return 0;
  let theta = 0;
  for (let iter = 0; iter < 40; iter++) {
    let num = -theta; // turunan prior
    let den = -1;
    for (const it of items) {
      const w = it.weight ?? 1;
      const p = pCorrect(theta, it.difficulty);
      num += DISCRIMINATION * w * ((it.correct ? 1 : 0) - p);
      den -= DISCRIMINATION * DISCRIMINATION * w * p * (1 - p);
    }
    if (Math.abs(den) < 1e-9) break;
    const step = num / den;
    theta -= step;
    theta = Math.max(-3.5, Math.min(3.5, theta));
    if (Math.abs(step) < 1e-5) break;
  }
  return theta;
}

/** Standard error estimasi theta (makin sedikit soal, makin besar). */
export function thetaSE(theta: number, items: ItemAttempt[]): number {
  let info = 1; // dari prior
  for (const it of items) {
    const p = pCorrect(theta, it.difficulty);
    info += DISCRIMINATION * DISCRIMINATION * (it.weight ?? 1) * p * (1 - p);
  }
  return 1 / Math.sqrt(info);
}

/** Petakan theta (-3..3) ke skala skor UTBK 200-1000 (rata-rata ~500). */
export function thetaToScore(theta: number): number {
  const raw = 500 + theta * 125;
  return Math.round(Math.max(200, Math.min(1000, raw)));
}

export type SubjectEstimate = {
  subject: string;
  label: string;
  theta: number;
  score: number;
  attempts: number;
  accuracyPct: number;
  /** Rentang keyakinan skor. */
  low: number;
  high: number;
};

export type PredictionResult = {
  total: number;
  low: number;
  high: number;
  subjects: SubjectEstimate[];
  sampleSize: number;
  confidence: "rendah" | "sedang" | "tinggi";
};

export function confidenceOf(sample: number): PredictionResult["confidence"] {
  if (sample >= 120) return "tinggi";
  if (sample >= 40) return "sedang";
  return "rendah";
}

export function predictScore(
  bySubject: { subject: string; label: string; items: ItemAttempt[] }[],
): PredictionResult {
  const subjects: SubjectEstimate[] = bySubject.map((s) => {
    const theta = estimateTheta(s.items);
    const se = thetaSE(theta, s.items);
    const correct = s.items.filter((i) => i.correct).length;
    return {
      subject: s.subject,
      label: s.label,
      theta,
      score: thetaToScore(theta),
      attempts: s.items.length,
      accuracyPct: s.items.length ? Math.round((correct / s.items.length) * 1000) / 10 : 0,
      low: thetaToScore(theta - 1.96 * se),
      high: thetaToScore(theta + 1.96 * se),
    };
  });

  const scored = subjects.filter((s) => s.attempts > 0);
  const sampleSize = subjects.reduce((a, s) => a + s.attempts, 0);
  const avg = (pick: (s: SubjectEstimate) => number) =>
    scored.length ? Math.round(scored.reduce((a, s) => a + pick(s), 0) / scored.length) : 0;

  return {
    total: avg((s) => s.score),
    low: avg((s) => s.low),
    high: avg((s) => s.high),
    subjects,
    sampleSize,
    confidence: confidenceOf(sampleSize),
  };
}
