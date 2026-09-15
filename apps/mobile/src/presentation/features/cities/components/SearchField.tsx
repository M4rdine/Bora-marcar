import { Pressable, StyleSheet, TextInput } from 'react-native';

import { t } from '../../../i18n/pt-BR';
import { AppText, Emoji, Surface, tokens } from '../../../ui';

type Props = {
  readonly value: string;
  readonly onChangeText: (text: string) => void;
};

export function SearchField({ value, onChangeText }: Props) {
  return (
    <Surface strength="strong" radius="pill" padding={3} style={styles.row}>
      <Emoji symbol="🔍" size={tokens.size.icon} label={t.cities.searchIcon} />
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
          hitSlop={tokens.space[2]}
        >
          <AppText variant="body" tone="muted">
            ✕
          </AppText>
        </Pressable>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  input: { flex: 1, color: tokens.color.text, fontSize: tokens.font.body, padding: 0 },
});
