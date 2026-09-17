// Servidor estático mínimo para o pacote web exportado.
// Todo caminho desconhecido cai no index.html, porque o Expo Router faz o roteamento
// no cliente: sem isso, abrir /profile direto devolveria 404.
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const [raiz, porta] = process.argv.slice(2);

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};

createServer((req, res) => {
  const pedido = decodeURIComponent((req.url ?? '/').split('?')[0]);
  // `normalize` mais o prefixo barram `..` tentando sair da pasta do build.
  const candidato = join(raiz, normalize(pedido));
  const arquivo =
    candidato.startsWith(raiz) && existsSync(candidato) && statSync(candidato).isFile()
      ? candidato
      : join(raiz, 'index.html');
  res.writeHead(200, {
    'Content-Type': TIPOS[extname(arquivo)] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  createReadStream(arquivo).pipe(res);
}).listen(Number(porta), '127.0.0.1');
