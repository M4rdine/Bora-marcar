import { z } from 'zod';

export const geocodingResultSchema = z.object({
  id: z.number(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
  country: z.string().optional(),
  country_code: z.string().optional(),
  admin1: z.string().optional(),
});

export const geocodingResponseSchema = z.object({
  results: z.array(geocodingResultSchema).optional(),
});

export type GeocodingResult = z.infer<typeof geocodingResultSchema>;
export type GeocodingResponse = z.infer<typeof geocodingResponseSchema>;
