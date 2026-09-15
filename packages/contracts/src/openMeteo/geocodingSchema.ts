import { z } from 'zod';

export const openMeteoGeocodingResultSchema = z.object({
  id: z.number(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
  country: z.string().optional(),
  country_code: z.string().optional(),
  admin1: z.string().optional(),
});

export const openMeteoGeocodingSchema = z.object({
  results: z.array(openMeteoGeocodingResultSchema).optional(),
});

export type OpenMeteoGeocodingResult = z.infer<typeof openMeteoGeocodingResultSchema>;
export type OpenMeteoGeocodingResponse = z.infer<typeof openMeteoGeocodingSchema>;
