// Мини-сервер статики: игре нужны ES-модули, а они не работают с file://. Отдаём только файлы игры.
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
const allowed = /^\/(index\.html|style\.css|src\/[\w.-]+\.js|assets\/planets\/[\w.-]+\.png)$/;
module.exports = function serve() {
  return new Promise(resolve => {
    const s = http.createServer((req, res) => {
      let p = decodeURIComponent((req.url || '/').split('?')[0]); if (p === '/') p = '/index.html';
      const f = path.join(root, p);
      if (!allowed.test(p) || !f.startsWith(root)) { res.writeHead(404); return res.end('not found'); }
      fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('not found'); } res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
    });
    s.listen(0, '127.0.0.1', () => resolve({ server: s, port: s.address().port }));
  });
};
