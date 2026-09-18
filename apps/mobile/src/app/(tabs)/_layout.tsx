import { Tabs } from 'expo-router';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/presentation/i18n/pt-BR';
import { AppText, fontFamily, Icon, tokens, type IconName } from '@/presentation/ui';

type TabIconProps = { readonly color: ColorValue; readonly focused: boolean };

const ICON_SIZE = 22;

/**
 * Um item da barra: ícone e rótulo dentro da MESMA pílula.
 *
 * O realce do estado ativo é desenhado aqui, e não por `tabBarActiveBackgroundColor`. Aquela
 * propriedade pinta o botão interno da biblioteca, onde o raio é fixado em zero para a variante
 * padrão — dava um retângulo de cantos vivos dentro de uma barra arredondada. Recortar pelo View
 * de fora com `overflow: 'hidden'` resolvia na web e QUEBRAVA no aparelho, onde a caixa do item
 * tem outra altura: o recorte comia o ícone e o rótulo.
 *
 * Por isso o rótulo padrão é desligado (`tabBarShowLabel: false`) e redesenhado junto do ícone: é
 * a única forma de a pílula envolver os DOIS sem depender de recorte, e sem um botão customizado
 * que teria de reimplementar o toque e a acessibilidade da biblioteca.
 *
 * O conjunto some da leitura de tela porque o botão já anuncia o título da aba; sem isso, o leitor
 * repetiria "Hoje, Hoje".
 */
function tabItem(name: IconName, label: string) {
  function TabItem({ color, focused }: TabIconProps) {
    const tint = focused ? tokens.color.text : String(color);
    return (
      <View
        style={[styles.pill, focused ? styles.pillActive : null]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Icon name={name} size={ICON_SIZE} color={tint} />
        <AppText variant="micro" style={[styles.label, { color: tint }]}>
          {label}
        </AppText>
      </View>
    );
  }
  TabItem.displayName = `TabItem(${name})`;
  return TabItem;
}

const HomeItem = tabItem('today', t.tabs.home);
const CitiesItem = tabItem('search', t.tabs.cities);
const ProfileItem = tabItem('medal', t.tabs.profile);

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
        tabBarShowLabel: false,
        // O item da biblioteca alinha o conteúdo ao TOPO (`justifyContent: 'flex-start'` com cinco
        // de padding), e a pílula saía quatro pontos acima da barra com vinte e dois sobrando
        // embaixo. Esticar o slot do ícone e centralizar dentro dele tira a posição das mãos da
        // biblioteca — o realce passa a ficar no meio da barra, qualquer que seja a altura dela.
        tabBarIconStyle: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        tabBarActiveTintColor: tokens.color.text,
        // A inativa era `textMuted` (branco a 82%), 18% de alfa de diferença da ativa: a navegação
        // primária não informava onde você estava. A 50% a distinção fica 3,5x maior, e o rótulo
        // ainda passa em AA sobre a barra.
        tabBarInactiveTintColor: tokens.color.tabInactive,
        sceneStyle: { backgroundColor: tokens.gradients.dusk[3] },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t.tabs.home, tabBarIcon: HomeItem }} />
      <Tabs.Screen name="cities" options={{ title: t.tabs.cities, tabBarIcon: CitiesItem }} />
      <Tabs.Screen name="profile" options={{ title: t.tabs.profile, tabBarIcon: ProfileItem }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[1],
    borderRadius: tokens.radius.pill,
  },
  pillActive: { backgroundColor: tokens.color.tabActiveBg },
  // Sem isto o rótulo cai na fonte do sistema: eram os únicos três textos do app fora das
  // famílias carregadas.
  label: { fontFamily: fontFamily('text', '600') },
});
