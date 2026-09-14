export const queryKeys = {
  cities: (query: string) => ['cities', query] as const,
  forecast: (cityId: string) => ['forecast', cityId] as const,
  engineConfig: () => ['engineConfig'] as const,
  progress: (today: string) => ['progress', today] as const,
  progressPrefix: () => ['progress'] as const,
};
