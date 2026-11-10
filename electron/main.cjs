// Оболочка для ПК: окно Electron + встроенный локальный сервер.  Запуск: npm run desktop
const { app, BrowserWindow } = require('electron'), serve = require('./server.cjs');
app.whenReady().then(async () => {
  const { port } = await serve();
  const win = new BrowserWindow({ width: 1280, height: 800, backgroundColor: '#000', autoHideMenuBar: true, title: 'Space Flight' });
  win.loadURL(`http://127.0.0.1:${port}/`);
});
app.on('window-all-closed', () => app.quit());
