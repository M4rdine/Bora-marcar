export type Clock = { now(): number };
export type IdGenerator = { next(): string };

export type NotificationInput = {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly atEpochMs: number;
};
export type NotificationScheduler = {
  schedule(input: NotificationInput): Promise<void>;
  cancel(id: string): Promise<void>;
};

export type LogMeta = Readonly<Record<string, unknown>>;
export type Logger = {
  info(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  error(message: string, meta?: LogMeta): void;
};
