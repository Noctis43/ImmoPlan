const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('path');
const config = require('./config');
const { waitForBackend } = require('./health-check');
const { startStaticServer, stopStaticServer } = require('./static-server');

/** @type {BrowserWindow | null} */
let mainWindow = null;

const isDev =
  process.env.ELECTRON_DEV === 'true' ||
  (!app.isPackaged && process.env.NODE_ENV !== 'production');

function getFrontendDistPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'frontend', 'dist');
  }
  return path.join(__dirname, '..', 'immoplan-frontend', 'dist');
}

async function ensureBackendAvailable() {
  const ok = await waitForBackend(config.backendHealthUrl, {
    timeoutMs: config.backendWaitTimeoutMs,
    intervalMs: config.backendPollIntervalMs,
  });

  if (!ok) {
    await dialog.showMessageBox({
      type: 'error',
      title: 'ImmoPlan — Backend requis',
      message: 'Le serveur Express n’est pas accessible.',
      detail: [
        'Démarrez le backend manuellement avant ImmoPlan :',
        '',
        '  cd immoplan-backend',
        '  npm run dev          (développement)',
        '  npm run start        (production, après npm run build)',
        '',
        `URL attendue : ${config.backendHealthUrl}`,
      ].join('\n'),
      buttons: ['Quitter'],
    });
    return false;
  }
  return true;
}

/**
 * @returns {Promise<string>}
 */
async function resolveRendererUrl() {
  if (isDev) {
    return config.devRendererUrl;
  }

  const distPath = getFrontendDistPath();
  const { url } = await startStaticServer(distPath, {
    port: config.staticPort,
    proxyTarget: config.backendProxyTarget,
  });
  return url;
}

async function createMainWindow() {
  const backendOk = await ensureBackendAvailable();
  if (!backendOk) {
    app.quit();
    return;
  }

  let loadUrl;
  try {
    loadUrl = await resolveRendererUrl();
  } catch (err) {
    await dialog.showMessageBox({
      type: 'error',
      title: 'ImmoPlan — Erreur de démarrage',
      message: 'Impossible de charger l’interface.',
      detail: err instanceof Error ? err.message : String(err),
      buttons: ['Quitter'],
    });
    app.quit();
    return;
  }

  mainWindow = new BrowserWindow({
    width: config.window.width,
    height: config.window.height,
    minWidth: config.window.minWidth,
    minHeight: config.window.minHeight,
    show: false,
    autoHideMenuBar: true,
    title: 'ImmoPlan',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  await mainWindow.loadURL(loadUrl);

  if (isDev && process.env.ELECTRON_OPEN_DEVTOOLS === 'true') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createMainWindow);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });

  app.on('before-quit', async () => {
    await stopStaticServer();
  });
}
