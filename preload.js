const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  onUpdateStatus: (callback) => ipcRenderer.on('update-status', (event, status) => callback(status)),
  getConnectivityInfo: () => ipcRenderer.invoke('get-connectivity-info'),
  getVersion: () => {
    const versionArg = process.argv.find(arg => arg.startsWith('--app-version='));
    return versionArg ? versionArg.split('=')[1] : '1.0.0';
  }
});
