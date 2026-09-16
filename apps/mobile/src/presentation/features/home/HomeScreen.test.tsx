import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import {
  fakeForecast,
  fakeLocation,
  fakeServices,
  fixedClock,
  memoryProgressRepository,
  saoPaulo,
} from '@/application/testing/fakes';
import { defaultEngineConfig, err, ok, recommendDay } from '@/domain';
import { logged, planned } from '@/domain/gamification/testing/fixtures';
import { makeForecast } from '@/domain/recommendation/testing/fixtures';

import { t } from '../../i18n/pt-BR';
import { usePreferences } from '../../state/preferencesStore';
import { renderWithProviders } from '../../testing/renderWithProviders';

import { HomeScreen } from './HomeScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }) }));

const DATES = ['2026-09-13', '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17'];
const goodServices = () => fakeServices({ forecast: fakeForecast(ok(makeForecast(DATES))) });

beforeEach(() => {
  usePreferences.setState({ city: null, activity: 'walk', favorites: [], recents: [] });
  mockPush.mockClear();
});

describe('HomeScreen', () => {
  it('sem cidade mostra as boas-vindas', () => {
    renderWithProviders(<HomeScreen />, { services: goodServices() });
    expect(screen.getByText('A melhor hora para sair, em uma frase.')).toBeTruthy();
    expect(screen.getByText('Como funciona')).toBeTruthy();
    expect(screen.getByLabelText('Passo 1')).toBeTruthy();
    expect(screen.getByLabelText('Passo 2')).toBeTruthy();
    expect(screen.getByLabelText('Passo 3')).toBeTruthy();
    fireEvent.press(screen.getByText('Buscar cidade'));
    expect(mockPush).toHaveBeenCalledWith('/cities');
  });

  it('nas boas-vindas, "Usar minha localização" seleciona a cidade do GPS', async () => {
    renderWithProviders(<HomeScreen />, {
      services: fakeServices({
        forecast: fakeForecast(ok(makeForecast(DATES))),
        location: fakeLocation(
          ok({
            coords: { latitude: saoPaulo.latitude, longitude: saoPaulo.longitude },
            city: saoPaulo,
          }),
        ),
      }),
    });
    fireEvent.press(screen.getByText('Usar minha localização'));
    await screen.findByText('São Paulo, Brasil');
    expect(usePreferences.getState().city?.id).toBe(saoPaulo.id);
  });

  it('nas boas-vindas, "Usar minha localização" negada mostra o erro traduzido', async () => {
    renderWithProviders(<HomeScreen />, { services: goodServices() });
    fireEvent.press(screen.getByText('Usar minha localização'));
    await screen.findByText(t.errors.denied);
  });

  it('com cidade mostra a janela de hoje e permite planejar e confirmar', async () => {
    usePreferences.setState({ city: saoPaulo });
    renderWithProviders(<HomeScreen />, { services: goodServices() });
    // cabeçalho: cidade e nível (progresso ainda carregado do zero-estado).
    await screen.findByText('São Paulo, Brasil');
    expect(screen.getByText('Nível 1')).toBeTruthy();
    // relógio falso: 14:00 em São Paulo → janela 14h–17h
    await screen.findByText('14h – 17h', {}, { timeout: 3000 });
    // a mesma nota aparece no herói e nas linhas da cronologia; aqui só interessa o herói.
    const planHero = screen.getByLabelText('hero');
    expect(within(planHero).getByText('Ótimo · 100')).toBeTruthy();
    // fatos da janela (fixture padrão: sensação 22°, chuva 5%).
    expect(within(planHero).getByText('22°')).toBeTruthy();
    expect(within(planHero).getByText('5%')).toBeTruthy();
    fireEvent.press(screen.getByText('Planejar Caminhada às 14h'));
    // 14:00 está dentro da janela → estado "confirm", com a atividade do plano, o score de agora
    // colorido e os fatores da janela (fixture padrão: sensação 22°).
    await screen.findByText('Confirmar que fui');
    const confirmHero = screen.getByLabelText('hero');
    expect(within(confirmHero).getByText('🚶 Caminhada · plano das 14h')).toBeTruthy();
    expect(within(confirmHero).getByText('Agora: Ótimo · 100')).toBeTruthy();
    expect(within(confirmHero).queryByText('Plano feito em outra cidade')).toBeNull();
    // fatores da janela do plano também aparecem no estado "confirm" (fixture padrão: sensação 22°).
    expect(within(confirmHero).getByText('22°')).toBeTruthy();
    fireEvent.press(screen.getByText('Confirmar que fui'));
    await screen.findByText('Concluído · Caminhada · 14h00');
    expect(screen.getByText('+130 XP')).toBeTruthy(); // 50 + 50 (score 100) + 25 (plano) + 5 (1 dia)
    expect(screen.getByLabelText('Cumpriu o plano: +25')).toBeTruthy();
    expect(screen.getByText('30 / 300 XP')).toBeTruthy(); // nível 2 vai de 100 a 400
    expect(screen.getByText('+25')).toBeTruthy();
    // concluído hoje: o atalho leva ao dia de amanhã, onde o plano é de fato criado.
    fireEvent.press(screen.getByText('Planejar amanhã às 6h'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/day/[date]',
      params: { date: '2026-09-14' },
    });
  });

  it('erro de rede mostra mensagem e botão de tentar de novo', async () => {
    usePreferences.setState({ city: saoPaulo });
    renderWithProviders(<HomeScreen />, {
      services: fakeServices({ forecast: fakeForecast(err({ code: 'network', message: 'x' })) }),
    });
    await screen.findByText('Sem conexão. Tente de novo.');
    expect(screen.getByText('Tentar de novo')).toBeTruthy();
  });

  it('a cronologia começa em agora, atravessa para amanhã e não mostra horas passadas', async () => {
    usePreferences.setState({ city: saoPaulo });
    renderWithProviders(<HomeScreen />, { services: goodServices() });
    await screen.findByText('Suas próximas horas');
    // relógio falso: 14:00. A hora atual entra marcada e as anteriores ficam de fora.
    expect(screen.getByLabelText(/^Hoje, 14h, /)).toBeTruthy();
    expect(screen.getByText('agora')).toBeTruthy();
    expect(screen.queryByLabelText(/^Hoje, 13h, /)).toBeNull();
    // 10 horas restantes de hoje e o resto vem de amanhã, sob o cabeçalho do dia.
    expect(screen.getByLabelText(/^Hoje, 23h, /)).toBeTruthy();
    const chronology = screen.getByLabelText('cronologia');
    expect(within(chronology).getByText('Hoje')).toBeTruthy();
    expect(within(chronology).getByText('Amanhã')).toBeTruthy();
  });

  it('toca numa hora e vê por que ela recebeu aquela nota', async () => {
    usePreferences.setState({ city: saoPaulo });
    renderWithProviders(<HomeScreen />, { services: goodServices() });
    await screen.findByText('Suas próximas horas');
    expect(screen.queryByText('Por que esta nota')).toBeNull();
    fireEvent.press(screen.getByLabelText(/^Hoje, 16h, /));
    await screen.findByText('Por que esta nota');
    // os cinco fatores do motor, cada um com o peso da atividade escolhida.
    expect(screen.getByLabelText(/^Temperatura: \d+% de conforto$/)).toBeTruthy();
    expect(screen.getByLabelText(/^Chuva: \d+% de conforto$/)).toBeTruthy();
    expect(screen.getByLabelText(/^Vento: \d+% de conforto$/)).toBeTruthy();
    expect(screen.getByLabelText(/^UV: \d+% de conforto$/)).toBeTruthy();
    expect(screen.getByLabelText(/^Sol: \d+% de conforto$/)).toBeTruthy();
    // tocar de novo fecha
    fireEvent.press(screen.getByLabelText(/^Hoje, 16h, /));
    expect(screen.queryByText('Por que esta nota')).toBeNull();
  });

  it('planeja numa hora escolhida na cronologia, não na que o motor recomendou', async () => {
    usePreferences.setState({ city: saoPaulo });
    renderWithProviders(<HomeScreen />, { services: goodServices() });
    await screen.findByText('Suas próximas horas');
    fireEvent.press(screen.getByLabelText(/^Hoje, 18h, /));
    fireEvent.press(await screen.findByText('Planejar Caminhada às 18h'));
    // o plano passa a ser das 18h, e não das 14h que o motor havia recomendado.
    await screen.findByText('Caminhada às 18h');
  });

  it('horas de amanhã explicam a nota mas não oferecem plano: o domínio guarda um por dia', async () => {
    usePreferences.setState({ city: saoPaulo });
    renderWithProviders(<HomeScreen />, { services: goodServices() });
    await screen.findByText('Suas próximas horas');
    const chronology = screen.getByLabelText('cronologia');
    const tomorrowHeading = within(chronology).getByText('Amanhã');
    expect(tomorrowHeading).toBeTruthy();
    fireEvent.press(screen.getByLabelText(/^Amanhã, 2h, /));
    await screen.findByText('Por que esta nota');
    expect(screen.queryByText('Planejar Caminhada às 2h')).toBeNull();
  });

  it('toca na linha de amanhã em Próximos dias e navega para /day/[date]', async () => {
    usePreferences.setState({ city: saoPaulo });
    renderWithProviders(<HomeScreen />, { services: goodServices() });
    await screen.findByText('Suas próximas horas');
    const nextDays = screen.getByLabelText('próximos dias');
    fireEvent.press(within(nextDays).getByText('Amanhã'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/day/[date]',
      params: { date: '2026-09-14' },
    });
  });

  it('plano ativo antes da janela mostra Planejado e permite desfazer', async () => {
    usePreferences.setState({ city: saoPaulo });
    renderWithProviders(<HomeScreen />, {
      services: fakeServices({
        forecast: fakeForecast(ok(makeForecast(DATES))),
        progress: memoryProgressRepository([planned('2026-09-13', { startHour: 17, endHour: 19 })]),
        clock: fixedClock(Date.UTC(2026, 8, 13, 11, 0, 0)),
      }),
    });
    // 08:00 em São Paulo, antes da janela 17h–19h → estado "planned"
    // o plano da fixture é de corrida; o título usa a atividade do plano, não a selecionada.
    await screen.findByText('Corrida às 17h');
    // a fixture planeja na cidade 'sp', que não é a São Paulo selecionada (id 3448439).
    expect(screen.getByText('Plano feito em outra cidade')).toBeTruthy();
    // previsão da janela (17h–19h), fixture padrão: sensação 22°, chuva 5%.
    expect(screen.getAllByText('22°').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('5%')).toBeTruthy();
    fireEvent.press(screen.getByText('Desfazer plano'));
    // após desfazer, o herói volta ao estado "plan" recalculado a partir das 08:00
    await screen.findByText(/Planejar Caminhada às \d+h/);
  });

  it('plano feito na cidade em foco não mostra o aviso de outra cidade', async () => {
    usePreferences.setState({ city: saoPaulo });
    renderWithProviders(<HomeScreen />, {
      services: fakeServices({
        forecast: fakeForecast(ok(makeForecast(DATES))),
        progress: memoryProgressRepository([
          planned('2026-09-13', { cityId: saoPaulo.id, startHour: 17, endHour: 19 }),
        ]),
        clock: fixedClock(Date.UTC(2026, 8, 13, 11, 0, 0)),
      }),
    });
    await screen.findByText('Corrida às 17h');
    expect(screen.queryByText('Plano feito em outra cidade')).toBeNull();
  });

  it('dia sem janela boa mostra o motivo, permite registrar e marca o dia de folga', async () => {
    usePreferences.setState({ city: saoPaulo });
    const progress = memoryProgressRepository();
    renderWithProviders(<HomeScreen />, {
      services: fakeServices({
        progress,
        forecast: fakeForecast(
          ok(
            // só hoje chove: amanhã segue com janela boa, então o atalho "Amanhã: …" aparece.
            makeForecast(DATES, (date) =>
              date === '2026-09-13' ? { precipitationProbability: 95, precipitationMm: 2 } : {},
            ),
          ),
        ),
      }),
    });
    // "Sem janela boa hoje" também pode aparecer nas linhas de "Próximos dias", então a
    // verificação do herói é escopada por `getByLabelText`.
    const hero = await screen.findByLabelText('hero');
    expect(within(hero).getByText('Sem janela boa hoje')).toBeTruthy();
    expect(within(hero).getByText('Motivo principal: chuva.')).toBeTruthy();
    expect(within(hero).getByText('Hoje não conta contra a sua sequência.')).toBeTruthy();
    // hierarquia: o atalho de amanhã é o botão primário; registrar fica discreto.
    expect(within(within(hero).getByTestId('button-primary')).getByText(/^Amanhã:/)).toBeTruthy();
    expect(
      within(within(hero).getByTestId('button-quiet')).getByText('Saí em outro horário'),
    ).toBeTruthy();
    await waitFor(() =>
      expect(progress.events().filter((e) => e.type === 'badWeatherDay')).toHaveLength(1),
    );
    // a guarda por data do `useBadWeatherRecorder` (não repetir a chamada nem duplicar o
    // evento dentro do mesmo dia) tem cobertura dedicada em `useBadWeatherRecorder.test.tsx`.
    fireEvent.press(within(hero).getByText('Amanhã: 6h – 9h, ótimo'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/day/[date]',
      params: { date: '2026-09-14' },
    });
    fireEvent.press(within(hero).getByText('Saí em outro horário'));
    // relógio falso: 14:00 em São Paulo → o seletor abre com a hora atual já em destaque.
    fireEvent.press(await screen.findByText('Registrar às 14h'));
    await screen.findByText(/Concluído · .+ · 14h00/);
    expect(screen.getByText(/\+\d+ XP/)).toBeTruthy();
  });

  it('dia bom cujas horas boas já passaram convida a registrar, sem marcar folga', async () => {
    usePreferences.setState({ city: saoPaulo, activity: 'beach' });
    const progress = memoryProgressRepository();
    renderWithProviders(<HomeScreen />, {
      services: fakeServices({
        progress,
        forecast: fakeForecast(ok(makeForecast(DATES))),
        // 2026-09-13T23:00Z = 20:00 em São Paulo: as horas boas de praia já passaram.
        clock: fixedClock(Date.UTC(2026, 8, 13, 23, 0, 0)),
      }),
    });
    await screen.findByText('Sua janela de hoje já passou');
    fireEvent.press(screen.getByText('Registrar atividade'));
    // relógio falso: 20:00 em São Paulo → o seletor abre com a hora atual já em destaque.
    fireEvent.press(await screen.findByText('Registrar às 20h'));
    await screen.findByText(/Concluído · .+ · 20h00/);
    expect(progress.events().some((e) => e.type === 'badWeatherDay')).toBe(false);
  });

  it('escolhe uma hora diferente da atual no seletor e registra com o score daquela hora', async () => {
    usePreferences.setState({ city: saoPaulo, activity: 'beach' });
    const progress = memoryProgressRepository();
    const forecast = makeForecast(DATES);
    renderWithProviders(<HomeScreen />, {
      services: fakeServices({
        progress,
        forecast: fakeForecast(ok(forecast)),
        // 2026-09-13T23:00Z = 20:00 em São Paulo: as horas boas de praia já passaram.
        clock: fixedClock(Date.UTC(2026, 8, 13, 23, 0, 0)),
      }),
    });
    await screen.findByText('Sua janela de hoje já passou');
    fireEvent.press(screen.getByText('Registrar atividade'));
    // "7h" também aparece nas horas de amanhã da cronologia; o seletor mora no herói.
    const logHero = screen.getByLabelText('hero');
    fireEvent.press(await within(logHero).findByText('7h'));
    fireEvent.press(within(logHero).getByText('Registrar às 7h'));
    await screen.findByText(/Concluído · .+ · 7h00/);
    const expectedScore = recommendDay(
      forecast,
      defaultEngineConfig.activities.beach,
      defaultEngineConfig,
      {
        date: '2026-09-13',
      },
    ).hours.find((h) => h.hour.hour === 7)?.score;
    await waitFor(() =>
      expect(
        progress
          .events()
          .some((e) => e.type === 'logged' && e.hourLeft === 7 && e.hourScore === expectedScore),
      ).toBe(true),
    );
  });

  it('registra no minuto exato do relógio ao confirmar a hora atual no seletor', async () => {
    usePreferences.setState({ city: saoPaulo });
    renderWithProviders(<HomeScreen />, {
      services: fakeServices({
        forecast: fakeForecast(ok(makeForecast(DATES))),
        progress: memoryProgressRepository([planned('2026-09-13', { startHour: 14, endHour: 17 })]),
        // 2026-09-13T17:37Z = 14:37 em São Paulo: dentro da janela do plano, minuto não redondo.
        clock: fixedClock(Date.UTC(2026, 8, 13, 17, 37, 0)),
      }),
    });
    await screen.findByText('Confirmar que fui');
    fireEvent.press(screen.getByText('Saí em outro horário'));
    // seletor abre com a hora atual (14h) já em destaque; confirmar sem trocar a seleção.
    fireEvent.press(await screen.findByText('Registrar às 14h'));
    await screen.findByText(/Concluído · .+ · 14h37/);
  });

  it('sem histórico, a faixa de streak mostra 0 dias seguidos', async () => {
    usePreferences.setState({ city: saoPaulo });
    renderWithProviders(<HomeScreen />, { services: goodServices() });
    await screen.findByText('0 dias seguidos');
  });

  it('com 1 dia seguido, a faixa de streak usa o singular', async () => {
    usePreferences.setState({ city: saoPaulo });
    renderWithProviders(<HomeScreen />, {
      services: fakeServices({
        forecast: fakeForecast(ok(makeForecast(DATES))),
        // registro em 2026-09-12 (véspera do "hoje" fixo 2026-09-13): streak = 1 dia.
        progress: memoryProgressRepository([logged('2026-09-12')]),
      }),
    });
    await screen.findByText('1 dia seguido');
  });
});
