import { t } from '../../../i18n/pt-BR';
import { AppText, Button, Surface } from '../../../ui';

type Props = {
  readonly onBack: () => void;
};

export function DayNotFound({ onBack }: Props) {
  return (
    <Surface strength="strong" radius="hero" padding={5} gap={3}>
      <AppText variant="body">{t.day.notFound}</AppText>
      <Button label={t.day.back} kind="quiet" onPress={onBack} />
    </Surface>
  );
}
