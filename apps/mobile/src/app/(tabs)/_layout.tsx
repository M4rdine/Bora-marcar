import { Tabs } from 'expo-router';
import { StyleSheet, View, type ColorValue } from 'react-native';

import { t } from '@/presentation/i18n/pt-BR';
import { fontFamily, Icon, tokens, type IconName } from '@/presentation/ui';

type TabIconProps = { readonly color: ColorValue; readonly focused: boolean };

const ICON_SIZE = 22;
/** Alta o bastante para a pílula respirar em volta do ícone, baixa o bastante para o rótulo
 * caber nos 64 pontos da barra. */
const PILL_HEIGHT = 30;

/**
 * Ícone vetorial, e não emoji. Emoji ignora `tabBarActiveTintColor` — glifo colorido não responde
 * à cor —, então ativa e inativa só diferiam por opacidade. Com vetor, a cor volta a ser o sinal.
 * A acessibilidade do botão já usa o título da tela, então o desenho é decorativo.
 *
 * A pílula do estado ativo é desenhada AQUI, e não por `tabBarActiveBackgroundColor`.
 *
 * Aquela propriedade pinta o botão interno da biblioteca, onde o raio é fixado em zero para a
 * variante padrão — dava um retângulo de cantos vivos dentro de uma barra arredondada. Recortar
 * pelo View de fora com `overflow: 'hidden'` resolvia na web e QUEBRAVA no aparelho: a caixa do
 * item tem outra altura ali, e o recorte comia o ícone e o rótulo.
 *
 * Desenhar a própria pílula não depende de recorte nenhum, então não tem como cortar nada.
 */
function tabIcon(name: IconName) {
  function TabIcon({ color, focused }: TabIconProps) {
    return (
      <View style={[styles.pill, focused ? styles.pillActive : null]}>
        <Icon name={name} size={ICON_SIZE} color={focused ? tokens.color.text : String(color)} />
      </View>
    );
  }
  TabIcon.displayName = `TabIcon(${name})`;
  return TabIcon;
}

const styles = StyleSheet.create({
  pill: {
    height: PILL_HEIGHT,
    paddingHorizontal: tokens.space[4],
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: { backgroundColor: tokens.color.tabActiveBg },
});

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
