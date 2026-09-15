// Harness de QA visual: Chrome headless + Chrome DevTools Protocol com emulação de iPhone.
// Uso: `node tools/qa-web/cdp.js tools/qa-web/scenarios/<cenario>.js` com o app web no ar
// (`pnpm --filter mobile exec expo start --web --port 8090`). Capturas saem em `tools/qa-web/out/`.
// Depende só do `ws` já presente no workspace (via metro) e de um Chrome instalado.
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const CHROME =
  process.env.QA_CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;
const OUT = process.env.QA_OUT ?? path.join(__dirname, 'out');
const APP = process.env.QA_APP ?? 'http://localhost:8090';
const W = 390,
  H = 844;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJSON = (p, method = 'GET') =>
  new Promise((res, rej) => {
    const req = http.request({ host: '127.0.0.1', port: PORT, path: p, method }, (r) => {
      let b = '';
      r.on('data', (c) => (b += c));
      r.on('end', () => {
        try {
          res(JSON.parse(b));
        } catch (e) {
          rej(new Error(b));
        }
      });
    });
    req.on('error', rej);
    req.end();
  });

async function launch() {
  fs.mkdirSync(OUT, { recursive: true });
  const proc = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${OUT}/profile`,
      '--no-first-run',
      '--no-default-browser-check',
      '--hide-scrollbars',
      '--disable-gpu',
      `--window-size=${W},${H}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  for (let i = 0; i < 50; i++) {
    try {
      await getJSON('/json/version');
      break;
    } catch {
      await sleep(200);
    }
  }
  return proc;
}

async function connect() {
  const t = await getJSON('/json/new?about:blank', 'PUT');
  const ws = new WebSocket(t.webSocketDebuggerUrl, { perMessageDeflate: false });
  await new Promise((r) => ws.on('open', r));
  let id = 0;
  const pending = new Map();
  const events = [];
  const handlers = {};
  ws.on('message', (m) => {
    const d = JSON.parse(m);
    if (d.id && pending.has(d.id)) {
      pending.get(d.id)(d);
      pending.delete(d.id);
    } else if (d.method) {
      events.push(d);
      if (handlers[d.method]) handlers[d.method](d.params);
    }
  });
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const i = ++id;
      pending.set(i, (d) =>
        d.error ? rej(new Error(method + ': ' + JSON.stringify(d.error))) : res(d.result),
      );
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  return {
    ws,
    send,
    evaluate,
    events,
    on: (m, fn) => {
      handlers[m] = fn;
    },
  };
}

async function setup(c) {
  await c.send('Page.enable');
  await c.send('Runtime.enable');
  await c.send('Emulation.setDeviceMetricsOverride', {
    width: W,
    height: H,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await c.send('Emulation.setUserAgentOverride', {
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
}

const helpers = (c) => ({
  goto: async (p = '/') => {
    await c.send('Page.navigate', { url: APP + p });
    await sleep(500);
  },
  wait: sleep,
  shot: async (name) => {
    const r = await c.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(r.data, 'base64'));
    console.log('shot', name);
  },
  text: () => c.evaluate('document.body.innerText'),
  rectOfText: (t, nth = 0) =>
    c.evaluate(
      `(() => { const all=[...document.querySelectorAll('div,span,button,a,p')].filter(e=>e.textContent.trim()===${JSON.stringify(t)}); const leaves=all.filter(e=>![...e.children].some(ch=>ch.textContent.trim()===${JSON.stringify(t)})); const e=leaves[${nth}]; if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height}; })()`,
    ),
  tap: async (x, y) => {
    await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(400);
  },
  clickText: async function (t, nth = 0) {
    const r = await this.rectOfText(t, nth);
    if (!r) throw new Error('text not found: ' + t);
    await this.tap(r.x, r.y);
  },
  type: async (t) => {
    await c.evaluate(
      "(() => { const i=document.querySelector('input'); i.focus(); return !!i; })()",
    );
    await c.send('Input.insertText', { text: t });
    await sleep(300);
  },
  scroll: async (dy) => {
    await c.send('Input.synthesizeScrollGesture', {
      x: W / 2,
      y: H / 2,
      yDistance: -dy,
      speed: 4000,
    });
    await sleep(600);
  },
  setStorage: async (k, v) =>
    c.evaluate(
      `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(typeof v === 'string' ? v : JSON.stringify(v))})`,
    ),
  getStorage: async (k) => c.evaluate(`localStorage.getItem(${JSON.stringify(k)})`),
  clearStorage: async () => c.evaluate('localStorage.clear()'),
  dump: async (name) => {
    fs.writeFileSync(path.join(OUT, name + '.txt'), await c.evaluate('document.body.innerText'));
  },
});

async function run(fn) {
  const proc = await launch();
  try {
    const c = await connect();
    await setup(c);
    await fn(helpers(c), c);
    c.ws.close();
  } finally {
    proc.kill('SIGKILL');
  }
}
module.exports = { run, sleep };
if (require.main === module) {
  const scenario = require(path.resolve(process.argv[2]));
  run(scenario).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
