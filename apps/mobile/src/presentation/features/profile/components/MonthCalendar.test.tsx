import { render, screen } from '@testing-library/react-native';

import type { MonthGrid } from '../monthGrid';

import { MonthCalendar } from './MonthCalendar';

const grid: MonthGrid = {
  title: 'Setembro 2026',
  weekdays: ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'],
  cells: [{ date: '2026-09-01', day: 1, state: 'rest' }],
};

describe('MonthCalendar', () => {
  it('dia de folga por mau tempo mostra a borda tracejada e o rótulo de folga', () => {
    render(<MonthCalendar grid={grid} />);
    expect(screen.getByLabelText('1: folga por mau tempo')).toBeTruthy();
  });
});
