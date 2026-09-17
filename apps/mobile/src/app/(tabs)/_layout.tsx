import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { t } from '@/presentation/i18n/pt-BR';
import { fontFamily, Icon, tokens, type IconName } from '@/presentation/ui';

type TabIconProps = { readonly color: ColorValue; readonly focused: boolean };

const ICON_SIZE = 22;

/**
 * Ícone vetorial, e não emoji. Emoji ignora `tabBarActiveTintColor` — glifo colorido não responde
 * à cor —, então ativa e inativa só diferiam por opacidade. Com vetor, a cor volta a ser o sinal.
 * A acessibilidade do botão já usa o título da tela, então o desenho é decorativo.
 */
function tabIcon(name: IconName) {
  function TabIcon({ color, focused }: TabIconProps) {
    return (
      <Icon name={name} size={ICON_SIZE} color={focused ? tokens.color.text : String(color)} />
    );
  }
  TabIcon.displayName = `TabIcon(${name})`;
  return TabIcon;
}

const HomeIcon = tabIcon('today');
const CitiesIcon = tabIcon('search');
const ProfileIcon = tabIcon('medal');

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
        // A inativa era `textMuted` (branco a 82%), 18% de alfa de diferença da ativa: a navegação
        // primária não informava onde você estava. A 50% a distinção fica 3,5x maior, e o rótulo
        // ainda passa em AA sobre a barra.
        tabBarInactiveTintColor: tokens.color.tabInactive,
        // Cor sozinha é sinal fraco; o fundo dá o sinal de forma.
        tabBarActiveBackgroundColor: tokens.color.tabActiveBg,
        tabBarItemStyle: { borderRadius: tokens.radius.inner, margin: tokens.space[1] },
        tabBarLabelStyle: {
          fontSize: tokens.font.micro,
          // Sem isto o rótulo cai na fonte do sistema: eram os únicos três textos do app fora
          // das famílias carregadas.
          fontFamily: fontFamily('text', '600'),
        },
        sceneStyle: { backgroundColor: tokens.gradients.dusk[3] },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t.tabs.home, tabBarIcon: HomeIcon }} />
      <Tabs.Screen name="cities" options={{ title: t.tabs.cities, tabBarIcon: CitiesIcon }} />
      <Tabs.Screen name="profile" options={{ title: t.tabs.profile, tabBarIcon: ProfileIcon }} />
    </Tabs>
  );
}
