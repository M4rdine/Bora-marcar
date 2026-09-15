import { z } from 'zod';

export const ACTIVITY_IDS = ['walk', 'run', 'cycle', 'beach', 'picnic'] as const;
export const FACTOR_IDS = ['thermal', 'rain', 'wind', 'uv', 'sun'] as const;

const WEIGHT_SUM_TOLERANCE = 1e-6;
const HOURS_IN_DAY = 24;
const MINUTES_IN_HOUR = 60;

const score = z.number().min(0).max(100);
const nonNegative = z.number().min(0);
const unit = z.number().min(0).max(1);

const limitSchema = z
  .object({ ok: nonNegative, max: nonNegative })
  .strict()
  .refine((l) => l.ok < l.max, { message: 'ok deve ser menor que max' });

const thermalSchema = z
  .object({ idealMin: z.number(), idealMax: z.number(), tolMin: z.number(), tolMax: z.number() })
  .strict()
  .refine((t) => t.tolMin < t.idealMin && t.idealMin <= t.idealMax && t.idealMax < t.tolMax, {
    message: 'esperado tolMin < idealMin <= idealMax < tolMax',
  });

const weightsSchema = z
  .object({ thermal: unit, rain: unit, wind: unit, uv: unit, sun: unit })
  .strict()
  .refine((w) => Math.abs(w.thermal + w.rain + w.wind + w.uv + w.sun - 1) < WEIGHT_SUM_TOLERANCE, {
    message: 'pesos devem somar 1',
  });

const activitySchema = z
  .object({
    id: z.enum(ACTIVITY_IDS),
    name: z.string().min(1),
    emoji: z.string().min(1),
    thermal: thermalSchema,
    wind: limitSchema,
    uv: limitSchema,
    nightFactor: unit,
    weights: weightsSchema,
  })
  .strict();

const activitiesSchema = z
  .object({
    walk: activitySchema,
    run: activitySchema,
    cycle: activitySchema,
    beach: activitySchema,
    picnic: activitySchema,
  })
  .strict()
  .refine((a) => ACTIVITY_IDS.every((id) => a[id].id === id), {
    message: 'o campo id de cada atividade deve repetir a chave',
  });

const scoresSchema = z
  .object({ great: score, good: score, fair: score })
  .strict()
  .refine((s) => s.great > s.good && s.good > s.fair, { message: 'great > good > fair' });

const windowSchema = z
  .object({
    sizes: z.array(z.number().int().min(1)).min(1).readonly(),
    minHourScore: score,
    lengthBonus: nonNegative,
    minRemainingMinutes: z.number().int().min(0).max(MINUTES_IN_HOUR),
    graceHoursAfterEnd: nonNegative,
    quietHoursEnd: z
      .number()
      .int()
      .min(0)
      .max(HOURS_IN_DAY - 1),
  })
  .strict();

const tipsSchema = z
  .object({
    uvProtect: nonNegative,
    waterApparent: z.number(),
    coolDropDeg: nonNegative,
    rainNextPct: score,
    coatApparent: z.number(),
  })
  .strict();

const xpSchema = z
  .object({
    base: nonNegative,
    planBonus: nonNegative,
    streakPerDay: nonNegative,
    streakMaxDays: z.number().int().min(0),
  })
  .strict();

const levelSchema = z
  .object({ level: z.number().int().min(1), xp: nonNegative, name: z.string().min(1) })
  .strict();

const levelsSchema = z
  .array(levelSchema)
  .min(1)
  .refine((levels) => levels[0]?.xp === 0, { message: 'o primeiro nível começa em 0 XP' })
  .refine((levels) => levels.every((l, i) => l.level === i + 1), {
    message: 'níveis devem ser 1..n consecutivos',
  })
  .refine((levels) => levels.every((l, i) => i === 0 || l.xp > (levels[i - 1]?.xp ?? 0)), {
    message: 'xp deve crescer estritamente',
  })
  .readonly();

export const engineConfigSchema = z
  .object({
    schemaVersion: z.literal(1),
    activities: activitiesSchema,
    scores: scoresSchema,
    window: windowSchema,
    tips: tipsSchema,
    xp: xpSchema,
    levels: levelsSchema,
  })
  .strict();

export type EngineConfigDto = z.infer<typeof engineConfigSchema>;
