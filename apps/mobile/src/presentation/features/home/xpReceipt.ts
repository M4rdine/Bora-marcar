import type { ActivityRecord } from '@/domain';

import { t } from '../../i18n/pt-BR';

export type XpReceiptRow = {
  readonly key: 'base' | 'hour' | 'plan' | 'streak';
  readonly label: string;
  readonly value: string;
};

export type XpReceiptResult = {
  readonly rows: readonly XpReceiptRow[];
  readonly total: number;
};

/** Parcelas do XP de um registro, na ordem em que aparecem no recibo. */
export function xpReceipt(record: ActivityRecord): XpReceiptResult {
  const rows: XpReceiptRow[] = [
    { key: 'base', label: t.receipt.base, value: String(record.xp.base) },
    { key: 'hour', label: t.receipt.hour(record.hourScore), value: `+${record.xp.hourBonus}` },
  ];
  if (record.planFulfilled) {
    rows.push({ key: 'plan', label: t.receipt.plan, value: `+${record.xp.planBonus}` });
  }
  if (record.xp.streakBonus > 0) {
    rows.push({
      key: 'streak',
      label: t.receipt.streak(record.streakDays),
      value: `+${record.xp.streakBonus}`,
    });
  }
  return { rows, total: record.xp.total };
}
