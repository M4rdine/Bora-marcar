import { defaultEngineConfig as cfg } from '../config/defaultEngineConfig';

import { makeHourScore } from './testing/fixtures';
import { candidateHours, dominantProblem, findBestWindow, isWithinWindow } from './windows';

const flat = (scores: readonly number[]) => scores.map((s, hour) => makeHourScore(hour, s));

describe('candidateHours', () => {
  const day = flat(Array.from({ length: 24 }, () => 70));

  it('sem "agora" devolve o dia inteiro', () => {
    expect(candidateHours(day, null, cfg)).toHaveLength(24);
  });

  it('inclui a hora atual se faltam pelo menos 30 min', () => {
    const c = candidateHours(day, { hour: 14, minute: 30 }, cfg);
    expect(c[0]?.hour.hour).toBe(14);
    expect(c).toHaveLength(10);
  });

  it('descarta a hora atual se faltam menos de 30 min', () => {
    const c = candidateHours(day, { hour: 14, minute: 31 }, cfg);
    expect(c[0]?.hour.hour).toBe(15);
  });
});

describe('findBestWindow', () => {
  it('escolhe a janela contígua de melhor ranking (média + 3 por hora extra)', () => {
    // 17,18,19 = 90,96,88 → média 91,3 + 6 = 97,3; 2h 17–18 = 93 + 3 = 96; 1h 18 = 96
    const scores = Array.from({ length: 24 }, (_, h) =>
      h === 17 ? 90 : h === 18 ? 96 : h === 19 ? 88 : 60,
    );
    const r = findBestWindow(flat(scores), cfg);
    expect(r.kind).toBe('window');
    if (r.kind !== 'window') return;
    expect(r.window).toEqual({ date: '2026-09-13', startHour: 17, endHour: 20 });
    expect(r.score).toBe(91);
  });

  it('prefere 1h de 96 a 2h de média 92 (96 > 92 + 3)', () => {
    const scores = Array.from({ length: 24 }, (_, h) => (h === 18 ? 96 : h === 19 ? 88 : 50));
    const r = findBestWindow(flat(scores), cfg);
    if (r.kind !== 'window') throw new Error('esperava janela');
    expect(r.window).toEqual({ date: '2026-09-13', startHour: 18, endHour: 19 });
  });

  it('com scores iguais, a janela mais longa vence pelo bônus', () => {
    const scores = Array.from({ length: 24 }, (_, h) => (h >= 7 && h <= 9 ? 80 : 40));
    const r = findBestWindow(flat(scores), cfg);
    if (r.kind !== 'window') throw new Error('esperava janela');
    expect(r.window).toEqual({ date: '2026-09-13', startHour: 7, endHour: 10 });
  });

  it('em empate de ranking e tamanho, prefere a mais cedo', () => {
    const scores = Array.from({ length: 24 }, (_, h) => (h === 7 || h === 17 ? 80 : 40));
    const r = findBestWindow(flat(scores), cfg);
    if (r.kind !== 'window') throw new Error('esperava janela');
    expect(r.window.startHour).toBe(7);
  });

  it('em empate de ranking entre tamanhos diferentes, prefere a mais cedo', () => {
    // 6–7 = 87 (2h, rank 90) vs 18 = 90 (1h, rank 90) → mais cedo vence
    const scores = Array.from({ length: 24 }, (_, h) =>
      h === 6 || h === 7 ? 87 : h === 18 ? 90 : 40,
    );
    const r = findBestWindow(flat(scores), cfg);
    if (r.kind !== 'window') throw new Error('esperava janela');
    expect(r.window).toEqual({ date: '2026-09-13', startHour: 6, endHour: 8 });
  });

  it('em empate de ranking e início, prefere a candidata mais longa', () => {
    // 10 = 90 (1h, rank 90) vs 10–11 = 87 (2h, rank 90), mesmo início → mais longa vence
    const scores = Array.from({ length: 24 }, (_, h) => (h === 10 ? 90 : h === 11 ? 84 : 30));
    const r = findBestWindow(flat(scores), cfg);
    if (r.kind !== 'window') throw new Error('esperava janela');
    expect(r.window).toEqual({ date: '2026-09-13', startHour: 10, endHour: 12 });
  });

  it('não atravessa horas não contíguas', () => {
    const hours = [makeHourScore(7, 80), makeHourScore(9, 80)];
    const r = findBestWindow(hours, cfg);
    if (r.kind !== 'window') throw new Error('esperava janela');
    expect(r.window).toEqual({ date: '2026-09-13', startHour: 7, endHour: 8 });
  });

  it('descarta janelas com alguma hora abaixo de 45', () => {
    const scores = Array.from({ length: 24 }, (_, h) =>
      h === 17 ? 100 : h === 18 ? 44 : h === 19 ? 100 : 30,
    );
    const r = findBestWindow(flat(scores), cfg);
    if (r.kind !== 'window') throw new Error('esperava janela');
    expect(r.window).toEqual({ date: '2026-09-13', startHour: 17, endHour: 18 });
  });

  it('hora com score exatamente 45 não é descartada', () => {
    const scores = Array.from({ length: 24 }, (_, h) => (h >= 17 && h <= 19 ? 45 : 30));
    const r = findBestWindow(flat(scores), cfg);
    if (r.kind !== 'window') throw new Error('esperava janela');
    expect(r.window).toEqual({ date: '2026-09-13', startHour: 17, endHour: 20 });
    expect(r.score).toBe(45);
  });

  it('sem hora >= 45 devolve none com a melhor hora e o problema dominante', () => {
    const hours = [
      makeHourScore(8, 20, { veto: 'rain' }),
      makeHourScore(9, 30, { comforts: { wind: 0.2 } }),
      makeHourScore(10, 30, { comforts: { thermal: 0.1 } }),
    ];
    const r = findBestWindow(hours, cfg);
    expect(r).toEqual({ kind: 'none', best: hours[1], dominant: 'wind' });
  });

  it('lista vazia devolve none sem melhor hora', () => {
    expect(findBestWindow([], cfg)).toEqual({ kind: 'none', best: null, dominant: null });
  });
});

describe('dominantProblem', () => {
  it('veto tem prioridade sobre conforto', () => {
    expect(dominantProblem(makeHourScore(8, 0, { veto: 'storm', comforts: { uv: 0 } }))).toBe(
      'storm',
    );
  });
  it('sem veto, é o fator de menor conforto', () => {
    expect(dominantProblem(makeHourScore(8, 50, { comforts: { rain: 0.4, uv: 0.3 } }))).toBe('uv');
  });
});

describe('isWithinWindow', () => {
  const w = { date: '2026-09-13', startHour: 17, endHour: 19 };
  it.each([
    [16, 59, false],
    [17, 0, true],
    [18, 59, true],
    [20, 59, true], // dentro das 2h de tolerância
    [21, 0, false],
  ])('%i:%i → %s', (hour, minute, expected) => {
    expect(isWithinWindow(w, { hour, minute }, 2)).toBe(expected);
  });
});
