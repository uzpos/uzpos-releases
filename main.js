const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const waitOn = require('wait-on');
const { autoUpdater } = require('electron-updater');
const os = require('os');
const fs = require('fs');

let mainWindow = null;
let serverProcess = null;

// Debug log file
const debugLogPath = path.join(app.getPath('userData'), 'startup-debug.log');
function logDebug(message) {
  const timestamp = new Date().toISOString();
  const formattedMsg = `${timestamp}: ${message}\n`;
  fs.appendFileSync(debugLogPath, formattedMsg);
  console.log(message);
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const localIP = getLocalIP();

function setupFirewall() {
  if (process.platform !== 'win32') return;
  try {
    logDebug('Checking/Setting up Windows Firewall rule for port 3000...');
    // Rule name "Uzpos External Access"
    const checkCmd = 'netsh advfirewall firewall show rule name="Uzpos External Access"';
    require('child_process').exec(checkCmd, (error) => {
      if (error) {
        // Rule doesn't exist, create it
        const addCmd = 'netsh advfirewall firewall add rule name="Uzpos External Access" dir=in action=allow protocol=TCP localport=3000';
        require('child_process').exec(addCmd, (err) => {
          if (err) logDebug(`Failed to add firewall rule: ${err.message}`);
          else logDebug('Firewall rule added successfully.');
        });
      } else {
        logDebug('Firewall rule already exists.');
      }
    });
  } catch (err) {
    logDebug(`Firewall setup error: ${err.message}`);
  }
}

async function checkServer(url) {
  const startTime = Date.now();
  const timeout = 30000; // 30 seconds timeout for production stability

  while (Date.now() - startTime < timeout) {
    try {
      const response = await new Promise((resolve) => {
        const req = http.get(url, (res) => {
          resolve(res.statusCode);
        });
        req.on('error', () => resolve(null));
        req.setTimeout(1000, () => {
          req.destroy();
          resolve(null);
        });
      });

      if (response === 200) {
        logDebug(`Server is ready at ${url}`);
        return true;
      }
    } catch (err) {
      // Ignore errors and retry
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  
  logDebug(`Server check timed out after ${timeout}ms`);
  return false;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false, // Clean startup: hidden until ready
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      additionalArguments: [`--local-ip=${localIP}`],
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, 'public/favicon.ico'),
    title: "Uzpos - Restoran Yönetim Sistemi"
  });

  // Removed automatic DevTools for production

  const loadingPath = path.join(__dirname, 'loading.html');
  logDebug(`Loading local file: ${loadingPath}`);
  mainWindow.loadFile(loadingPath).catch(err => {
    logDebug(`Failed to load loading.html: ${err.message}`);
  });

  const url = 'http://localhost:3000';
  logDebug(`Beginning health check for ${url}`);

  const isReady = await checkServer(url);
  if (isReady) {
    logDebug('Server responded with 200 OK. Transitioning to app UI.');
    if (mainWindow) {
      mainWindow.loadURL(url);
      mainWindow.once('ready-to-show', () => {
        mainWindow.show();
      });
    }
  } else {
    logDebug('Server check timed out.');
    dialog.showErrorBox(
      "Sistem Başlatılamadı",
      "Dahili sunucu yanıt vermedi. Lütfen uygulamayı tekrar başlatmayı deneyin veya logları kontrol edin."
    );
    if (mainWindow) {
      mainWindow.loadURL(url);
      mainWindow.show();
    }
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();
  }
}

// IPC Handlers
ipcMain.on('check-for-updates', () => {
  if (app.isPackaged) {
    logDebug('Manual update check requested.');
    autoUpdater.checkForUpdatesAndNotify();
  } else {
    logDebug('Manual update check ignored in development.');
    if (mainWindow) {
      mainWindow.webContents.send('update-status', 'Güncelleme kontrolü geliştirme modunda devre dışı.');
    }
  }
});

ipcMain.handle('get-connectivity-info', () => {
  return {
    ip: localIP,
    port: process.env.PORT || '3000'
  };
});

// AutoUpdater Events
autoUpdater.on('checking-for-update', () => {
  if (mainWindow) mainWindow.webContents.send('update-status', 'Güncellemeler denetleniyor...');
});
autoUpdater.on('update-available', () => {
  if (mainWindow) mainWindow.webContents.send('update-status', 'Yeni sürüm mevcut. İndiriliyor...');
});
autoUpdater.on('update-not-available', () => {
  if (mainWindow) mainWindow.webContents.send('update-status', 'Sistem güncel.');
});
autoUpdater.on('error', (err) => {
  if (mainWindow) mainWindow.webContents.send('update-status', `Hata: ${err.message}`);
});
autoUpdater.on('update-downloaded', () => {
  if (mainWindow) mainWindow.webContents.send('update-status', 'Güncelleme hazır. Yeniden başlatılıyor...');
  setTimeout(() => {
    autoUpdater.quitAndInstall();
  }, 3000);
});

async function prepareStandalone() {
  const isDev = !app.isPackaged;
  if (isDev) return path.join(__dirname, '.next', 'standalone', 'server.js');

  const userDataPath = app.getPath('userData');
  const standaloneDir = path.join(userDataPath, 'standalone');
  const versionMarker = path.join(standaloneDir, `version_${app.getVersion()}`);
  
  if (fs.existsSync(versionMarker)) {
    logDebug('Standalone already prepared for this version.');
    return path.join(standaloneDir, 'server.js');
  }

  logDebug(`Preparing standalone in ${standaloneDir}...`);
  if (fs.existsSync(standaloneDir)) {
    fs.rmSync(standaloneDir, { recursive: true, force: true });
  }
  fs.mkdirSync(standaloneDir, { recursive: true });

  const zipPath = path.join(process.resourcesPath, 'standalone.zip');
  if (!fs.existsSync(zipPath)) {
    throw new Error(`Critical error: standalone.zip not found at ${zipPath}`);
  }

  logDebug('Extracting standalone.zip...');
  const extractCmd = `powershell -Command "Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${standaloneDir.replace(/'/g, "''")}' -Force"`;
  require('child_process').execSync(extractCmd);

  // Copy static and public resources
  const staticSrc = path.join(process.resourcesPath, 'standalone_static');
  const staticDest = path.join(standaloneDir, '.next', 'static');
  if (fs.existsSync(staticSrc)) {
    fs.mkdirSync(path.dirname(staticDest), { recursive: true });
    fs.cpSync(staticSrc, staticDest, { recursive: true });
  }

  const publicSrc = path.join(process.resourcesPath, 'standalone_public');
  const publicDest = path.join(standaloneDir, 'public');
  if (fs.existsSync(publicSrc)) {
    fs.cpSync(publicSrc, publicDest, { recursive: true });
  }

  fs.writeFileSync(versionMarker, Date.now().toString());
  logDebug('Standalone preparation complete.');
  return path.join(standaloneDir, 'server.js');
}

async function startServer() {
  const isDev = !app.isPackaged;
  logDebug(`Starting server. Mode: ${isDev ? 'Development' : 'Production'}`);
  
  try {
    const standalonePath = await prepareStandalone();

    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'data.db');
    const oldDbPath = path.join(userDataPath, 'dev.db');
    
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    if (fs.existsSync(oldDbPath) && !fs.existsSync(dbPath)) {
      fs.renameSync(oldDbPath, dbPath);
    }
    if (!fs.existsSync(dbPath)) {
      const seedDbPath = path.join(process.resourcesPath, 'prisma', 'dev.db');
      if (fs.existsSync(seedDbPath)) {
        fs.copyFileSync(seedDbPath, dbPath);
      }
    }

    process.env.NODE_ENV = isDev ? 'development' : 'production';
    process.env.DATABASE_URL = `file:${dbPath}`;
    process.env.PORT = '3000';
    process.env.HOSTNAME = '0.0.0.0';
    process.env.NEXT_PUBLIC_LOCAL_IP = localIP;

    if (fs.existsSync(standalonePath)) {
      logDebug(`Requiring standalone server from: ${standalonePath}`);
      const standaloneDir = path.dirname(standalonePath);
      process.chdir(standaloneDir);
      require(standalonePath);
      logDebug('Standalone server required successfully.');
    } else {
      throw new Error(`Standalone server file not found at ${standalonePath}`);
    }
  } catch (err) {
    logDebug(`CRITICAL STARTUP ERROR: ${err.message}`);
    dialog.showErrorBox("Sistem Başlatılamadı", err.message + "\n\nStack: " + err.stack);
  }
}

app.on('ready', () => {
  setupFirewall();
  startServer();
  createWindow();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (serverProcess && typeof serverProcess.kill === 'function') {
    console.log('Stopping dev server process...');
    serverProcess.kill();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
