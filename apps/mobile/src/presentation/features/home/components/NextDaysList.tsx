import type { Comparison, DayRecommendation } from '@/domain';

import { formatDayTitle } from '../../../i18n/dates';
import { t } from '../../../i18n/pt-BR';
import { weatherGlyph } from '../../../i18n/weatherGlyph';
import { SectionHeader, Surface } from '../../../ui';

import { DayRow } from './DayRow';

type Props = {
  readonly days: readonly DayRecommendation[];
  readonly comparison: Comparison;
  readonly bestDate: string | null;
  readonly today: string;
  readonly tomorrow: string;
  readonly onOpenDay: (date: string) => void;
};

const asideFor = (comparison: Comparison): string | undefined => {
  if (comparison === 'tomorrowBetter') return t.home.tomorrowBetter;
  if (comparison === 'todayBestOfWeek') return t.home.todayBest;
  return undefined;
};

export function NextDaysList({ days, comparison, bestDate, today, tomorrow, onOpenDay }: Props) {
  return (
    <Surface strength="soft" radius="card" padding={4} gap={2}>
      <SectionHeader title={t.home.nextDays} aside={asideFor(comparison)} />
      {days.map((day) => (
        <DayRow
          key={day.date}
          day={day}
          title={formatDayTitle(day.date, today, tomorrow)}
          glyph={day.daily ? weatherGlyph(day.daily.weatherCode) : weatherGlyph(-1)}
          isBest={day.date === bestDate}
          onPress={() => onOpenDay(day.date)}
        />
      ))}
    </Surface>
  );
}
