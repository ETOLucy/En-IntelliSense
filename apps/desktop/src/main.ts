import { app, BrowserWindow, shell, type IpcMainInvokeEvent } from 'electron';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import { registerByokHandlers } from './byok.js';
import { registerFileHandlers } from './files.js';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const rendererPath = join(currentDirectory, '..', '..', 'web', 'dist', 'index.html');
const rendererUrl = pathToFileURL(rendererPath).toString();

function isTrustedSender(event: IpcMainInvokeEvent) {
  const url = event.senderFrame?.url;
  if (!url) return false;
  return url === rendererUrl || /^http:\/\/127\.0\.0\.1:\d+\//.test(url);
}

function isAllowedExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['writemelo.com', 'github.com'].includes(url.hostname);
  } catch {
    return false;
  }
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 760,
    minHeight: 560,
    show: false,
    backgroundColor: '#f4f6f5',
    title: 'WriteMelo',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(currentDirectory, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.once('ready-to-show', () => window.show());
  void window.loadFile(rendererPath);
}

app.whenReady().then(() => {
  registerByokHandlers({ userDataPath: app.getPath('userData'), isTrustedSender });
  registerFileHandlers({ isTrustedSender });
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
