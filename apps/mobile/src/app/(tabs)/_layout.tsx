import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { t } from '@/presentation/i18n/pt-BR';
import { AppText, tokens } from '@/presentation/ui';

type TabIconProps = { readonly color: ColorValue; readonly focused: boolean };

const INACTIVE_OPACITY = 0.55;
const INACTIVE_SCALE = 0.92;

// A acessibilidade do botão da aba já usa o título da tela; o emoji é só decoração. A aba
// ativa fica visualmente distinguível por opacidade e escala além da cor do rótulo.
function tabIconStyle({ color, focused }: TabIconProps) {
  return {
    color,
    fontSize: tokens.font.subtitle,
    opacity: focused ? 1 : INACTIVE_OPACITY,
    transform: [{ scale: focused ? 1 : INACTIVE_SCALE }],
  };
}

function HomeIcon(props: TabIconProps) {
  return <AppText style={tabIconStyle(props)}>{t.tabs.icons.home}</AppText>;
}

function CitiesIcon(props: TabIconProps) {
  return <AppText style={tabIconStyle(props)}>{t.tabs.icons.cities}</AppText>;
}

function ProfileIcon(props: TabIconProps) {
  return <AppText style={tabIconStyle(props)}>{t.tabs.icons.profile}</AppText>;
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
      <Tabs.Screen name="index" options={{ title: t.tabs.home, tabBarIcon: HomeIcon }} />
      <Tabs.Screen name="cities" options={{ title: t.tabs.cities, tabBarIcon: CitiesIcon }} />
      <Tabs.Screen name="profile" options={{ title: t.tabs.profile, tabBarIcon: ProfileIcon }} />
    </Tabs>
  );
}
