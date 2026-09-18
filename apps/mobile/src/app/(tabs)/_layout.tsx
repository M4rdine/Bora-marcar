import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // A barra encosta na borda de baixo e se estende por baixo do indicador de home. Antes ela
        // flutuava a doze pontos do fundo, e essa faixa deixava o céu aparecer entre a barra e a
        // borda da tela — lia como sobra, não como respiro.
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: tokens.size.tabBar + insets.bottom,
          paddingBottom: insets.bottom,
          borderTopLeftRadius: tokens.radius.tabBar,
          borderTopRightRadius: tokens.radius.tabBar,
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
        /**
         * O botão do item é nosso, e é aqui que o realce do estado ativo é desenhado.
         *
         * Duas tentativas anteriores falharam por tentar a costura errada.
         * `tabBarActiveActiveBackgroundColor` pinta o botão INTERNO da biblioteca, onde o raio é
         * fixado em zero — retângulo de cantos vivos dentro de uma barra arredondada. Recortar
         * por fora com `overflow: 'hidden'` resolvia na web e comia ícone e rótulo no aparelho.
         * E desenhar a pílula dentro de `tabBarIcon` não cabe: aquele slot é FIXO em 31 por 28,
         * com as duas cópias do ícone em `position: 'absolute'` — o rótulo transbordava na web e
         * sumia no nativo.
         *
         * `tabBarButton` recebe ícone e rótulo como filhos, então a pílula envolve os dois sem
         * recorte e sem depender de medida interna de biblioteca nenhuma.
         */
        tabBarButton: (props) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: props['aria-selected'] === true }}
            accessibilityLabel={props['aria-label']}
            testID={props.testID}
            onPress={props.onPress}
            onLongPress={props.onLongPress}
            style={styles.button}
          >
            <View style={[styles.pill, props['aria-selected'] === true ? styles.pillActive : null]}>
              {props.children}
            </View>
          </Pressable>
        ),
        sceneStyle: { backgroundColor: tokens.gradients.dusk[3] },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t.tabs.home, tabBarIcon: HomeIcon }} />
      <Tabs.Screen name="cities" options={{ title: t.tabs.cities, tabBarIcon: CitiesIcon }} />
      <Tabs.Screen name="profile" options={{ title: t.tabs.profile, tabBarIcon: ProfileIcon }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  // Substitui o botão interno da biblioteca, então precisa esticar e centralizar por conta.
  button: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: tokens.space[3],
    // Dois pontos, e não quatro: com quatro a pílula ficava a dois da borda da barra, e uma fonte
    // maior no sistema encostaria nela.
    paddingVertical: 2,
    borderRadius: tokens.radius.pill,
  },
  pillActive: { backgroundColor: tokens.color.tabActiveBg },
});
