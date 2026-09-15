// Percorre os estados do herói semeando `localStorage` e interceptando a resposta do Open-Meteo.
const city = (c) =>
  JSON.stringify({
    state: { city: c, activity: 'walk', favorites: [], recents: [c], lastForecast: null },
    version: 2,
  });
const SAO_PAULO = {
  id: '3448439',
  name: 'São Paulo',
  admin1: 'São Paulo',
  country: 'Brasil',
  countryCode: 'BR',
  latitude: -23.5475,
  longitude: -46.63611,
  timezone: 'America/Sao_Paulo',
};
const RAINY_HOURS = 24;

const rainyToday = (c) =>
  c.on('Fetch.requestPaused', async (p) => {
    try {
      const body = await c.send('Fetch.getResponseBody', { requestId: p.requestId });
      const json = JSON.parse(
        Buffer.from(body.body, body.base64Encoded ? 'base64' : 'utf8').toString(),
      );
      const h = json.hourly;
      const soak = (arr, value) => arr.map((v, i) => (i < RAINY_HOURS ? value : v));
      const hourly = {
        ...h,
        precipitation_probability: soak(h.precipitation_probability, 95),
        precipitation: soak(h.precipitation, 6.5),
        weather_code: soak(h.weather_code, 65),
      };
      await c.send('Fetch.fulfillRequest', {
        requestId: p.requestId,
        responseCode: 200,
        responseHeaders: [
          { name: 'content-type', value: 'application/json' },
          { name: 'access-control-allow-origin', value: '*' },
        ],
        body: Buffer.from(JSON.stringify({ ...json, hourly })).toString('base64'),
      });
    } catch {
      await c.send('Fetch.continueRequest', { requestId: p.requestId });
    }
  });

module.exports = async (h, c) => {
  await h.goto('/');
  await h.wait(3000);
  await h.clearStorage();
  await h.goto('/');
  await h.wait(6000);
  await h.shot('welcome');

  await h.setStorage('prefs:v1', city(SAO_PAULO));
  await h.goto('/');
  await h.wait(7000);
  await h.shot('home-plan');
  await h.scroll(900);
  await h.clickText('Amanhã');
  await h.wait(3000);
  await h.shot('day-tomorrow');

  await c.evaluate('localStorage.removeItem("progress:v1")');
  await c.send('Fetch.enable', {
    patterns: [{ urlPattern: '*open-meteo.com/v1/forecast*', requestStage: 'Response' }],
  });
  rainyToday(c);
  await h.goto('/');
  await h.wait(7000);
  await h.shot('home-no-window');
  await c.send('Fetch.disable');

  await h.goto('/profile');
  await h.wait(5000);
  await h.shot('profile');
};
