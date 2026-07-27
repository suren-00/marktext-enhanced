const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setLanguage: (lang) => ipcRenderer.send('set-language', lang),
  onMenuAction: (callback) => ipcRenderer.on('menu-action', (event, action) => callback(action))
});
