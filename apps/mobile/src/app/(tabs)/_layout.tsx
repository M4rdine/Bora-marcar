import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { t } from '@/presentation/i18n/pt-BR';
import { AppText, tokens } from '@/presentation/ui';

type TabIconProps = { readonly color: ColorValue };

/** A acessibilidade do botão da aba já usa o título da tela; o emoji é só decoração. */
function tabIcon(symbol: string) {
  return function TabIcon({ color }: TabIconProps) {
    return <AppText style={{ color, fontSize: tokens.font.subtitle }}>{symbol}</AppText>;
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          left: tokens.space[3],
          right: tokens.space[3],
          bottom: tokens.space[3],
          height: tokens.size.tabBar,
          borderRadius: tokens.radius.tabBar,
          borderTopWidth: 0,
          backgroundColor: tokens.color.tabBar,
        },
        tabBarActiveTintColor: tokens.color.text,
        tabBarInactiveTintColor: tokens.color.textMuted,
        tabBarLabelStyle: { fontSize: tokens.font.micro },
        sceneStyle: { backgroundColor: tokens.gradients.dusk[3] },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t.tabs.home, tabBarIcon: tabIcon(t.tabs.icons.home) }}
      />
      <Tabs.Screen
        name="cities"
        options={{ title: t.tabs.cities, tabBarIcon: tabIcon(t.tabs.icons.cities) }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t.tabs.profile, tabBarIcon: tabIcon(t.tabs.icons.profile) }}
      />
    </Tabs>
  );
}
