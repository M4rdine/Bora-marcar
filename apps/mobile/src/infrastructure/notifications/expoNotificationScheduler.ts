import * as Notifications from 'expo-notifications';

import type { Logger, NotificationScheduler } from '@/application/ports';

/** Chamar uma vez na raiz do app: mostra a notificação mesmo com o app em primeiro plano. */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export const expoNotificationScheduler = (logger: Logger): NotificationScheduler => ({
  async schedule({ id, title, body, atEpochMs }) {
    if (atEpochMs <= Date.now()) {
      logger.info('Lembrete no passado; não agendado', { id });
      return;
    }
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) {
      logger.warn('Permissão de notificação negada; lembrete não agendado', { id });
      return;
    }
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(atEpochMs) },
    });
  },
  async cancel(id) {
    await Notifications.cancelScheduledNotificationAsync(id);
  },
});
