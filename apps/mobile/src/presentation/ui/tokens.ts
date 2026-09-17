export type SkyPhase = 'dawn' | 'day' | 'dusk' | 'night' | 'rainy';

export const tokens = {
  color: {
    text: '#FFFFFF',
    textMuted: 'rgba(255,255,255,0.82)',
    // Superfícies escuras, não claras: vidro branco sobre céu claro deixa o fundo MAIS claro e
    // derruba o contraste do texto branco. Os dois materiais diferem por 14 pontos de alfa, o
    // suficiente para um cartão dentro de outro ainda se distinguir.
    surface: 'rgba(0,0,0,0.26)',
    surfaceStrong: 'rgba(0,0,0,0.40)',
    border: 'rgba(255,255,255,0.28)',
    /** Realce de um pixel no topo da superfície: é ele que faz o cartão ler como objeto com
     * espessura, e não como um retângulo de opacidade. */
    surfaceEdge: 'rgba(255,255,255,0.14)',
    ink: '#2C2C5E',
    accent: '#FFFFFF',
    accentInk: '#4B3FB5',
    mint: '#8FF0B6',
    mintInk: '#0A4A2A',
    gold: '#FFD66B',
    goldInk: '#5A3F00',
    goldSoft: 'rgba(255,214,107,0.25)',
    goldBorder: 'rgba(255,214,107,0.5)',
    danger: '#FF9B8A',
    dangerInk: '#5A1A0F',
    // Quatro notas, quatro cores. `great` e `good` eram o MESMO verde, então "Ótimo · 100" e
    // "Bom · 72" saíam como pílulas idênticas e a escala de 0 a 100 não significava nada.
    score: { great: '#4FDF95', good: '#9BD3A8', fair: '#FFD66B', poor: '#FF9B8A' },
    scoreInk: { great: '#06331C', good: '#0A4A2A', fair: '#5A3F00', poor: '#5A1A0F' },
    // Encaixe dentro de uma superfície (trilhos, medalhas): mais fundo que `surface`.
    shade: 'rgba(0,0,0,0.30)',
    shadow: '#000000',
    // Quase opaca de propósito: a 0.22 o conteúdo da tela atravessava a barra e parecia defeito.
    tabBar: 'rgba(12,16,28,0.94)',
  },
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40 },
  radius: { hero: 24, card: 16, inner: 12, pill: 999, cell: 8, tabBar: 22 },
  font: { display: 52, xp: 56, title: 20, subtitle: 16, body: 14, small: 12, micro: 10 },
  size: {
    /** Mínimo de alvo de toque da Apple. Nenhum controle do app fica abaixo disto. */
    minTouch: 44,
    orb: 34,
    orbBorder: 3,
    orbLarge: 64,
    streakSquare: 18,
    badgeIcon: 52,
    badgeBox: 58,
    badgeGlyph: 26,
    glow: 160,
    sunArc: 34,
    /** Corpo do marcador ☀️/🌙 do arco do sol: igual ao `fontSize` padrão do `Emoji`. */
    sunMarker: 16,
    flag: 22,
    icon: 22,
    tabBar: 64,
  },
  /**
   * O céu. As paradas são profundas de propósito: texto branco lê direto sobre elas em nível AA
   * (pior caso 5,52:1), o que dispensa qualquer véu por cima. A versão anterior era pastel e
   * precisava de um véu preto que apagava a atmosfera — as 14h ficavam tão escuras quanto as 23h.
   *
   * Em `dawn` a segunda parada é mais clara que a primeira de propósito: é a faixa de brilho do
   * horizonte, que é onde o céu de verdade acende no nascer do sol.
   */
  gradients: {
    // amanhecer: luz fria que esquenta, em rosa e violeta, com pouco laranja
    dawn: ['#5E3A52', '#A8486B', '#6A4188', '#2C2A66'],
    day: ['#2A6A96', '#1C4F9E', '#1B3C86'],
    // entardecer: calor que apaga, em laranja queimado e carmim — o oposto do amanhecer, para
    // que o céu consiga dizer se é manhã ou noite
    dusk: ['#A83E14', '#93273F', '#4E2C7E', '#20204F'],
    night: ['#2A2B5E', '#1B1C42', '#0C0D26'],
    rainy: ['#4A5566', '#3C4655', '#2A3340'],
  } satisfies Record<SkyPhase, readonly [string, string, ...string[]]>,
} as const;

export type ScoreTone = keyof typeof tokens.color.score;
