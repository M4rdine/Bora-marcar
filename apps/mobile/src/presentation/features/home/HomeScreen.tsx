import { Text, View } from 'react-native';

import { t } from '../../i18n/pt-BR';

export function HomeScreen() {
  return (
    <View>
      <Text>{t.tabs.home}</Text>
    </View>
  );
}
