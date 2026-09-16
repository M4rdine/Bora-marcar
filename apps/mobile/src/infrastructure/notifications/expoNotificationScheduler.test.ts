import type { Logger } from '@/application/ports';

import { expoNotificationScheduler } from './expoNotificationScheduler';

// prefixo `mock` é o que o Jest permite referenciar de dentro da fábrica do `jest.mock`.
const mockSchedule = jest.fn();
const mockCancel = jest.fn();
const mockPermission = jest.fn();

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date' },
  scheduleNotificationAsync: (...args: unknown[]) => mockSchedule(...args),
  cancelScheduledNotificationAsync: (...args: unknown[]) => mockCancel(...args),
  requestPermissionsAsync: () => mockPermission(),
}));

const fakeLogger = () => {
  const calls: { level: keyof Logger; message: string }[] = [];
  const record =
    (level: keyof Logger) =>
    (message: string): void => {
      calls.push({ level, message });
    };
  return {
    logger: { info: record('info'), warn: record('warn'), error: record('error') } as Logger,
    calls,
  };
};

const FUTURE = () => Date.now() + 60_000;
const reminder = { id: 'r1', title: 'Bora', body: 'Sua janela começa em 30 min' };

beforeEach(() => {
  mockSchedule.mockReset().mockResolvedValue(undefined);
  mockCancel.mockReset().mockResolvedValue(undefined);
  mockPermission.mockReset().mockResolvedValue({ granted: true });
});

describe('expoNotificationScheduler', () => {
  it('agenda quando há permissão e o horário está no futuro', async () => {
    const { logger, calls } = fakeLogger();
    await expoNotificationScheduler(logger).schedule({ ...reminder, atEpochMs: FUTURE() });
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(0);
  });

  it('não agenda lembrete no passado, e isso não é erro', async () => {
    const { logger, calls } = fakeLogger();
    await expoNotificationScheduler(logger).schedule({ ...reminder, atEpochMs: Date.now() - 1 });
    expect(mockSchedule).not.toHaveBeenCalled();
    expect(calls.map((c) => c.level)).toEqual(['info']);
  });

  it('permissão negada avisa, mas não levanta erro', async () => {
    mockPermission.mockResolvedValue({ granted: false });
    const { logger, calls } = fakeLogger();
    await expoNotificationScheduler(logger).schedule({ ...reminder, atEpochMs: FUTURE() });
    expect(mockSchedule).not.toHaveBeenCalled();
    expect(calls.map((c) => c.level)).toEqual(['warn']);
  });

  it('falha ao agendar vira aviso, não erro: em dev um erro sobe como faixa vermelha na tela', async () => {
    mockSchedule.mockRejectedValue(new Error('sem suporte'));
    const { logger, calls } = fakeLogger();
    await expoNotificationScheduler(logger).schedule({ ...reminder, atEpochMs: FUTURE() });
    expect(calls.map((c) => c.level)).toEqual(['warn']);
  });

  it('falha ao cancelar vira aviso: ela caía justamente sobre o momento da recompensa', async () => {
    mockCancel.mockRejectedValue(new Error('sem suporte'));
    const { logger, calls } = fakeLogger();
    await expoNotificationScheduler(logger).cancel('r1');
    expect(calls.map((c) => c.level)).toEqual(['warn']);
    expect(calls.every((c) => c.level !== 'error')).toBe(true);
  });

  it('cancelar com sucesso não fala nada', async () => {
    const { logger, calls } = fakeLogger();
    await expoNotificationScheduler(logger).cancel('r1');
    expect(mockCancel).toHaveBeenCalledWith('r1');
    expect(calls).toHaveLength(0);
  });
});
