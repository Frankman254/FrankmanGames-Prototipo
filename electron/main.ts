// Proceso principal de Electron: sólo abre la ventana. El juego entero vive en
// el renderer (contextIsolation, sin Node, sin URLs remotas).
import { app, BrowserWindow, ipcMain, Menu, screen } from 'electron';
import path from 'node:path';

const devUrl = process.env['VITE_DEV_SERVER_URL'];
/** Modo medición: `--bench` ejecuta la prueba de carga y cierra. */
const benchMode = process.argv.includes('--bench');

function isAllowedUrl(url: string): boolean {
  if (devUrl) return url.startsWith(devUrl);
  return url.startsWith('file://');
}

/** Tamaños que el juego puede pedir (Opciones → Pantalla); cualquier otro se ignora. */
const WINDOW_SIZES = new Set(['1920x1080', '3440x1440', '3840x2160']);

/** Ajusta el área de dibujo sin salirse del monitor en que está la ventana. */
function fitContentSize(win: BrowserWindow, width: number, height: number): void {
  const area = screen.getDisplayMatching(win.getBounds()).workArea;
  const [outerW, outerH] = win.getSize();
  const [innerW, innerH] = win.getContentSize();
  const frameW = outerW! - innerW!;
  const frameH = outerH! - innerH!;
  win.setContentSize(Math.min(width, area.width - frameW), Math.min(height, area.height - frameH));
  win.center();
}

function createWindow(): void {
  const win = new BrowserWindow({
    // La medición se hace a 1080p (área de dibujo, sin bordes de ventana).
    width: 1920,
    height: 1080,
    useContentSize: true,
    // En un monitor de 1080p la barra de tareas recorta la ventana: pantalla completa.
    fullscreen: benchMode,
    backgroundColor: '#1b1d22',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // En medición la ventana no debe frenarse si pierde el foco.
      backgroundThrottling: !benchMode,
    },
  });

  if (!benchMode) fitContentSize(win, 1920, 1080);
  win.once('ready-to-show', () => win.show());
  // Pantalla completa nativa: a diferencia de la del navegador, Esc no la abandona.
  ipcMain.on('window:fullscreen', (event, on: unknown) => {
    if (event.sender === win.webContents) win.setFullScreen(on === true);
  });
  ipcMain.on('window:size', (event, width: unknown, height: unknown) => {
    if (event.sender !== win.webContents || !WINDOW_SIZES.has(`${String(width)}x${String(height)}`)) return;
    if (win.isFullScreen()) return;
    fitContentSize(win, Number(width), Number(height));
  });

  // La pantalla completa la pide el juego (Opciones o su tecla, F11 por defecto)
  // con la API de pantalla completa del renderer, así se puede reasignar.

  // Nada de navegar fuera del juego ni abrir ventanas nuevas.
  win.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedUrl(url)) event.preventDefault();
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  if (benchMode) {
    // El renderer imprime una línea `BENCH {json}` al terminar.
    win.webContents.on('console-message', (_e, _level, message) => {
      if (message.startsWith('BENCH ')) {
        process.stdout.write(`${message}\n`);
        app.quit();
      }
    });
  }

  const query = benchMode ? { bench: '1' } : undefined;
  if (devUrl) {
    void win.loadURL(devUrl + (benchMode ? '?bench=1' : ''));
  } else {
    void win.loadFile(path.join(__dirname, '../dist/index.html'), query ? { query } : {});
  }
}

Menu.setApplicationMenu(null);
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
