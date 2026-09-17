/**
 * O alfabeto visual do app, desenhado aqui e em nenhum outro lugar.
 *
 * Antes disto todo signo era emoji do sistema ou caractere de texto, em seis vocabulários
 * diferentes. Emoji renderiza com o desenho do sistema operacional, não do produto, e muda a cada
 * versão do iOS: é, por definição, o ícone de outra pessoa.
 *
 * Regras do conjunto, para ele parecer um conjunto:
 * - grade de 24 por 24, traço de 2, pontas e junções redondas
 * - só geometria simples: círculo, linha, arco. Nada de curva livre.
 * - o que é "cheio" (estrela marcada, medalha) preenche; o resto é contorno
 */
export type IconName =
  // abas
  | 'today'
  | 'search'
  | 'medal'
  // affordances
  | 'caret'
  | 'star'
  | 'starFilled'
  | 'close'
  | 'back'
  | 'settings'
  // fatos do clima
  | 'thermal'
  | 'drop'
  | 'wind'
  | 'uv'
  // tempo
  | 'clear'
  | 'fewClouds'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'showers'
  | 'snow'
  | 'thunder'
  // atividades
  | 'walk'
  | 'run'
  | 'cycle'
  | 'beach'
  | 'picnic';

export type IconShape =
  | { readonly kind: 'path'; readonly d: string; readonly fill?: boolean }
  | {
      readonly kind: 'circle';
      readonly cx: number;
      readonly cy: number;
      readonly r: number;
      readonly fill?: boolean;
    }
  | {
      readonly kind: 'line';
      readonly x1: number;
      readonly y1: number;
      readonly x2: number;
      readonly y2: number;
    };

const line = (x1: number, y1: number, x2: number, y2: number): IconShape => ({
  kind: 'line',
  x1,
  y1,
  x2,
  y2,
});
const path = (d: string, fill = false): IconShape => ({ kind: 'path', d, fill });
const circle = (cx: number, cy: number, r: number, fill = false): IconShape => ({
  kind: 'circle',
  cx,
  cy,
  r,
  fill,
});

/** Nuvem canônica, reusada por todo estado de tempo encoberto, para a família ser coerente. */
const CLOUD = 'M7 18h9.5a3.5 3.5 0 0 0 .4-6.98A5 5 0 0 0 7.2 10 4 4 0 0 0 7 18Z';
/** Meia nuvem, para os estados em que o sol ainda aparece. */
const CLOUD_SMALL = 'M9 19h7.5a3 3 0 0 0 .3-5.98A4.2 4.2 0 0 0 9.2 12 3.5 3.5 0 0 0 9 19Z';
const SUN_RAYS: readonly IconShape[] = [
  line(12, 2, 12, 4),
  line(12, 20, 12, 22),
  line(2, 12, 4, 12),
  line(20, 12, 22, 12),
  line(4.9, 4.9, 6.3, 6.3),
  line(17.7, 17.7, 19.1, 19.1),
  line(4.9, 19.1, 6.3, 17.7),
  line(17.7, 6.3, 19.1, 4.9),
];

export const ICON_SHAPES: Record<IconName, readonly IconShape[]> = {
  // — abas —
  today: [circle(12, 12, 4.2), ...SUN_RAYS.slice(0, 4), path(CLOUD_SMALL)],
  search: [circle(11, 11, 6.5), line(15.8, 15.8, 20, 20)],
  medal: [circle(12, 14, 6), path('M9 3h6l-1.6 5.2a6 6 0 0 0-2.8 0Z'), circle(12, 14, 2.3, true)],

  // — affordances —
  caret: [path('M6 9.5 12 15.5 18 9.5')],
  star: [path('m12 3.6 2.6 5.5 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.8Z')],
  starFilled: [
    path('m12 3.6 2.6 5.5 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.8Z', true),
  ],
  close: [line(6.5, 6.5, 17.5, 17.5), line(17.5, 6.5, 6.5, 17.5)],
  back: [path('M14.5 5 7.5 12l7 7')],
  settings: [
    circle(12, 12, 3),
    path(
      'M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M5.2 18.8l2.1-2.1M16.7 7.3l2.1-2.1',
    ),
  ],

  // — fatos do clima —
  thermal: [
    path('M11 13.6V5a2.5 2.5 0 0 1 5 0v8.6'),
    circle(13.5, 17, 3.4),
    circle(13.5, 17, 1.4, true),
  ],
  drop: [path('M12 3.5c3.4 4 5.5 6.7 5.5 9.4a5.5 5.5 0 0 1-11 0c0-2.7 2.1-5.4 5.5-9.4Z')],
  wind: [path('M3 8.5h10a3 3 0 1 0-3-3'), path('M3 13h13a3 3 0 1 1-3 3'), line(3, 17.5, 9, 17.5)],
  uv: [circle(12, 12, 4.2), ...SUN_RAYS],

  // — tempo —
  clear: [circle(12, 12, 4.6), ...SUN_RAYS],
  fewClouds: [circle(9.5, 9.5, 3.4), ...SUN_RAYS.slice(0, 4), path(CLOUD_SMALL)],
  cloudy: [path(CLOUD)],
  fog: [path(CLOUD_SMALL), line(4, 20.5, 12, 20.5), line(15, 20.5, 20, 20.5)],
  drizzle: [path(CLOUD_SMALL), line(9, 20, 8.2, 22), line(13, 20, 12.2, 22)],
  rain: [path(CLOUD_SMALL), line(9, 20, 8, 23), line(13, 20, 12, 23), line(17, 20, 16, 23)],
  showers: [path(CLOUD_SMALL), line(9.5, 20, 8, 23.5), line(14.5, 20, 13, 23.5)],
  snow: [
    path(CLOUD_SMALL),
    line(8, 21, 11, 21),
    line(9.5, 19.5, 9.5, 22.5),
    line(14, 21, 17, 21),
    line(15.5, 19.5, 15.5, 22.5),
  ],
  thunder: [path(CLOUD_SMALL), path('M13 19.5 10 23h3l-1.2 2.5')],

  // — atividades —
  walk: [
    circle(13, 4.5, 2.2),
    path('M13 7.5 10.5 13l3 2 1 6'),
    path('M10.5 13 7 16l-1 5'),
    line(13.5, 9.5, 17, 11.5),
  ],
  run: [
    circle(14.5, 4.5, 2.2),
    path('M14.5 7.5 10 11.5l3.5 3 .5 6'),
    path('M10 11.5 5.5 14l-.5 5'),
    line(14, 9, 18.5, 10.5),
  ],
  cycle: [
    circle(5.5, 17, 3.8),
    circle(18.5, 17, 3.8),
    circle(14, 4.5, 1.8),
    path('M5.5 17 10 10h5l3.5 7'),
    line(10, 10, 14, 13),
  ],
  beach: [
    circle(17, 6, 3.2),
    path('M4 20.5c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 5 0'),
    path('M17 9.2v7'),
  ],
  picnic: [
    path('M4.5 11.5h15l-2 9h-11Z'),
    line(3, 11.5, 21, 11.5),
    path('M8.5 11.5c0-4 1.6-6 3.5-6s3.5 2 3.5 6'),
  ],
};
