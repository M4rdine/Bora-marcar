import { Pressable, StyleSheet, View } from 'react-native';

import type { ActivePlan, ActivityId, EngineConfig } from '@/domain';

import { t } from '../../../i18n/pt-BR';
import { activityIcon, AppText, Icon, tokens } from '../../../ui';

type Props = {
  readonly plans: readonly ActivePlan[];
  readonly selected: ActivityId;
  readonly config: EngineConfig;
  readonly onSelect: (id: ActivityId) => void;
};

const ICON_SIZE = 16;
const CHEVRON = 14;

/**
 * Os planos de hoje que NÃO são da atividade selecionada.
 *
 * O plano é por atividade, então o cartão principal é o da aba em que você está. Sem esta faixa,
 * marcar ciclismo e depois olhar corrida esconderia o ciclismo por completo — e o app pareceria
 * ter perdido o plano. Ela devolve o que o cartão deixou de mostrar, em uma linha, e leva de
 * volta com um toque.
 */
export function OtherPlans({ plans, selected, config, onSelect }: Props) {
  const outros = plans.filter((p) => p.activity !== selected);
  if (outros.length === 0) return null;
  return (
    <View style={styles.wrap}>
      {outros.map((plan) => {
        const nome = config.activities[plan.activity].name;
        return (
          <Pressable
            key={plan.planId}
            accessibilityRole="button"
            accessibilityLabel={t.home.otherPlanGo(nome, plan.window.startHour)}
            onPress={() => onSelect(plan.activity)}
            style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
          >
            <Icon name={activityIcon(plan.activity)} size={ICON_SIZE} />
            <AppText variant="small" style={styles.label}>
              {t.home.otherPlan(nome, plan.window.startHour)}
            </AppText>
            <Icon name="caret" size={CHEVRON} color={tokens.color.textMuted} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[1] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    minHeight: tokens.size.minTouch,
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.surface,
    borderWidth: 1,
    borderColor: tokens.color.surfaceEdge,
  },
  label: { flex: 1 },
  pressed: { opacity: 0.7 },
});
