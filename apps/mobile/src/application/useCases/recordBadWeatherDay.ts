import type { Clock, IdGenerator, ProgressRepository } from '../ports';

export type BadWeatherInput = {
  readonly cityId: string;
  readonly date: string;
  readonly bestScore: number;
};
type Deps = {
  readonly progress: ProgressRepository;
  readonly clock: Clock;
  readonly ids: IdGenerator;
};

export const recordBadWeatherDay =
  ({ progress, clock, ids }: Deps) =>
  async (input: BadWeatherInput): Promise<void> => {
    const events = await progress.load();
    const already = events.some((e) => e.type === 'badWeatherDay' && e.date === input.date);
    if (already) return;
    await progress.append({
      type: 'badWeatherDay',
      id: ids.next(),
      cityId: input.cityId,
      date: input.date,
      bestScore: input.bestScore,
      createdAt: clock.now(),
    });
  };
