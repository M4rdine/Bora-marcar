import { fireEvent, render, screen } from '@testing-library/react-native';

import type { PickableHour } from '../pickableHours';

import { HourPicker } from './HourPicker';

const options: readonly PickableHour[] = [
  { hour: 6, score: 70, label: 'good' },
  { hour: 7, score: 82, label: 'great' },
  { hour: 8, score: 40, label: 'poor' },
];

describe('HourPicker', () => {
  it('lista a hora mais recente primeiro, para a atual aparecer sem rolar', () => {
    render(<HourPicker options={options} selected={8} onSelect={jest.fn()} />);
    expect(screen.getAllByText(/^\d+h$/).map((node) => node.props.children)).toEqual([
      '8h',
      '7h',
      '6h',
    ]);
  });

  it('não altera a lista recebida e repassa a hora tocada', () => {
    const onSelect = jest.fn();
    const before = options.map((o) => o.hour);
    render(<HourPicker options={options} selected={8} onSelect={onSelect} />);
    fireEvent.press(screen.getByText('6h'));
    expect(onSelect).toHaveBeenCalledWith(6);
    expect(options.map((o) => o.hour)).toEqual(before);
  });
});
