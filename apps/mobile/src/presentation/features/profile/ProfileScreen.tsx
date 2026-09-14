import { Text, View } from 'react-native';

import { t } from '../../i18n/pt-BR';

export function ProfileScreen() {
  return (
    <View>
      <Text>{t.tabs.profile}</Text>
    </View>
  );
}
