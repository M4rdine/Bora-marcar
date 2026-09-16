export type SkyPhase = 'dawn' | 'day' | 'dusk' | 'night' | 'rainy';

export const tokens = {
  color: {
    text: '#FFFFFF',
    textMuted: 'rgba(255,255,255,0.82)',
    // Superfícies escuras, não claras. Vidro branco sobre um céu claro deixa o fundo MAIS claro e
    // derruba o contraste do texto branco; escurecer separa a superfície do céu e ainda ajuda a ler.
    // Os três materiais também passam a diferir de verdade, em vez de 2% de alfa entre eles.
    surface: 'rgba(0,0,0,0.18)',
    surfaceStrong: 'rgba(0,0,0,0.30)',
    border: 'rgba(255,255,255,0.28)',
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
    score: { great: '#8FF0B6', good: '#8FF0B6', fair: '#FFD66B', poor: '#FF9B8A' },
    scoreInk: { great: '#0A4A2A', good: '#0A4A2A', fair: '#5A3F00', poor: '#5A1A0F' },
    // Encaixe dentro de uma superfície (trilhos, medalhas): mais fundo que `surface`.
    shade: 'rgba(0,0,0,0.22)',
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
  gradients: {
    dawn: ['#F6C9A0', '#E8927A', '#8E6AA6', '#4C4477'],
    day: ['#9FD3F5', '#5AA2E0', '#3D6FC0'],
    dusk: ['#F7B388', '#E58AA0', '#7D63B8', '#2C2C5E'],
    night: ['#3B3F7A', '#23264F', '#101230'],
    rainy: ['#B6BCC8', '#7C8597', '#444B5A'],
  } satisfies Record<SkyPhase, readonly [string, string, ...string[]]>,
  /**
   * Véu entre o céu e o conteúdo. É um gradiente, e não um preto chapado, porque os tons claros
   * de cada fase ficam sempre no topo: escurecendo mais em cima e menos embaixo, o texto branco
   * passa a ser legível em toda a tela sem apagar a cor da base do céu.
   */
  scrim: ['rgba(0,0,0,0.50)', 'rgba(0,0,0,0.26)'] as const,
} as const;

export type ScoreTone = keyof typeof tokens.color.score;
