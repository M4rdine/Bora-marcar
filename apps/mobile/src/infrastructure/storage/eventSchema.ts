import { z } from 'zod';

import { ACTIVITY_IDS } from '@/domain';

const base = { id: z.string().min(1), createdAt: z.number() };
const activity = z.enum(ACTIVITY_IDS);
const window = z.object({
  date: z.string(),
  startHour: z.number().int(),
  endHour: z.number().int(),
});

export const gamificationEventSchema = z.discriminatedUnion('type', [
  z.object({
    ...base,
    type: z.literal('planned'),
    cityId: z.string(),
    activity,
    date: z.string(),
    window,
    windowScore: z.number(),
  }),
  z.object({
    ...base,
    type: z.literal('confirmed'),
    planId: z.string(),
    date: z.string(),
    hourLeft: z.number().int(),
    minuteLeft: z.number().int().min(0).max(59).optional(),
    hourScore: z.number(),
  }),
  z.object({
    ...base,
    type: z.literal('logged'),
    cityId: z.string(),
    activity,
    date: z.string(),
    hourLeft: z.number().int(),
    minuteLeft: z.number().int().min(0).max(59).optional(),
    hourScore: z.number(),
  }),
  z.object({ ...base, type: z.literal('planCancelled'), planId: z.string() }),
  z.object({
    ...base,
    type: z.literal('badWeatherDay'),
    cityId: z.string(),
    date: z.string(),
    bestScore: z.number(),
  }),
]);

export const storedProgressSchema = z.object({
  schemaVersion: z.literal(1),
  events: z.array(gamificationEventSchema),
});

export type StoredProgress = z.infer<typeof storedProgressSchema>;
export type StoredEvent = z.infer<typeof gamificationEventSchema>;
