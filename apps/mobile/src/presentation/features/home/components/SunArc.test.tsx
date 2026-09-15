import { render, screen } from '@testing-library/react-native';

import { SunArc } from './SunArc';

const sunrise = '2026-09-13T06:12';
const sunset = '2026-09-13T18:04';

describe('SunArc', () => {
  it('hoje: horários e marcador ☀️ dentro do dia', () => {
    render(<SunArc sunrise={sunrise} sunset={sunset} nowMinutes={12 * 60} />);
    expect(screen.getByText('06:12')).toBeTruthy();
    expect(screen.getByText('18:04')).toBeTruthy();
    expect(screen.getByLabelText('Sol')).toBeTruthy();
  });

  it('hoje à noite: marcador 🌙', () => {
    render(<SunArc sunrise={sunrise} sunset={sunset} nowMinutes={22 * 60} />);
    expect(screen.getByLabelText('Lua')).toBeTruthy();
  });

  it('outro dia (sem "agora"): horários sem marcador', () => {
    render(<SunArc sunrise={sunrise} sunset={sunset} nowMinutes={null} />);
    expect(screen.getByText('06:12')).toBeTruthy();
    expect(screen.getByText('18:04')).toBeTruthy();
    expect(screen.queryByLabelText('Sol')).toBeNull();
    expect(screen.queryByLabelText('Lua')).toBeNull();
  });

  it('sem nascer/pôr do sol: só o arco', () => {
    render(<SunArc sunrise={null} sunset={null} nowMinutes={12 * 60} />);
    expect(screen.queryByText(/\d\d:\d\d/)).toBeNull();
    expect(screen.queryByLabelText('Sol')).toBeNull();
  });
});
