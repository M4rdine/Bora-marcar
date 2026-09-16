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

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * Lembrete é um acessório: se agendar ou cancelar falhar, o plano continua valendo e não há nada
 * que o usuário possa fazer a respeito. Por isso `warn`, e não `error` — em desenvolvimento o
 * `console.error` sobe como faixa vermelha na tela, e ela estava caindo em cima do momento da
 * recompensa, que é o pico do produto.
 */

export const expoNotificationScheduler = (logger: Logger): NotificationScheduler => ({
  async schedule({ id, title, body, atEpochMs }) {
    if (atEpochMs <= Date.now()) {
      logger.info('Lembrete no passado; não agendado', { id });
      return;
    }
    try {
      const permission = await Notifications.requestPermissionsAsync();
      if (!permission.granted) {
        logger.warn('Permissão de notificação negada; lembrete não agendado', { id });
        return;
      }
      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content: { title, body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(atEpochMs),
        },
      });
    } catch (e) {
      logger.warn('Falha ao agendar lembrete', { id, error: messageOf(e) });
    }
  },
  async cancel(id) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (e) {
      logger.warn('Falha ao cancelar lembrete', { id, error: messageOf(e) });
    }
  },
});
