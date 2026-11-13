const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const host = '127.0.0.1';
const port = Number(process.env.PORT) || 5500;
const projectRoot = __dirname;
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.mp4': 'audio/mp4',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const server = http.createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, `http://${host}:${port}`).pathname);
  } catch {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Bad request');
    return;
  }

  if (pathname === '/') {
    response.writeHead(302, { Location: '/offline-dino/' });
    response.end();
    return;
  }

  const relativePath = pathname.replace(/^\/+/, '');
  const filePath = path.resolve(projectRoot, relativePath);
  if (filePath !== projectRoot && !filePath.startsWith(projectRoot + path.sep)) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    const targetPath = !statError && stats.isDirectory() ? path.join(filePath, 'index.html') : filePath;
    fs.readFile(targetPath, (readError, content) => {
      if (readError) {
        response.writeHead(readError.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end(readError.code === 'ENOENT' ? 'Not found' : 'Unable to read file');
        return;
      }

      response.writeHead(200, {
        'Content-Type': mimeTypes[path.extname(targetPath).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-cache'
      });
      response.end(content);
    });
  });
});

let activePort = port;
server.on('error', error => {
  if (error.code === 'EADDRINUSE' && activePort < port + 10) {
    activePort += 1;
    server.listen(activePort, host);
    return;
  }
  console.error(`Could not start the dev server: ${error.message}`);
  process.exitCode = 1;
});
server.on('listening', () => {
  const address = server.address();
  console.log(`Offline Dino Runner is ready at http://${host}:${address.port}/offline-dino/`);
  if (address.port !== port) console.log(`Port ${port} was already in use; using ${address.port} instead.`);
  console.log('Press Ctrl+C to stop the server.');
});
server.listen(activePort, host);
