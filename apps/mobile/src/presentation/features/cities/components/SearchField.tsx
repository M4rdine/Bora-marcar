import { Pressable, StyleSheet, TextInput } from 'react-native';

import { t } from '../../../i18n/pt-BR';
import { Icon, Surface, tokens } from '../../../ui';

type Props = {
  readonly value: string;
  readonly onChangeText: (text: string) => void;
};

export function SearchField({ value, onChangeText }: Props) {
  return (
    <Surface strength="strong" radius="pill" padding={3} style={styles.row}>
      <Icon
        name="search"
        size={tokens.size.icon}
        color={tokens.color.textMuted}
        label={t.cities.searchIcon}
      />
      <TextInput
        accessibilityLabel={t.cities.placeholder}
        placeholder={t.cities.placeholder}
        placeholderTextColor={tokens.color.textMuted}
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        autoCorrect={false}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.cities.clear}
          onPress={() => onChangeText('')}
          style={({ pressed }) => [styles.clear, pressed ? styles.pressed : null]}
        >
          <Icon name="close" size={ICON_SIZE} color={tokens.color.textMuted} />
        </Pressable>
      ) : null}
    </Surface>
  );
}

const ICON_SIZE = 18;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  input: { flex: 1, color: tokens.color.text, fontSize: tokens.font.body, padding: 0 },
  // 44pt é o mínimo de alvo de toque da Apple; a caixa visível é menor, a de toque não.
  clear: {
    minWidth: tokens.size.minTouch,
    minHeight: tokens.size.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
});
