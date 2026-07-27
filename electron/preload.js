const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback, selectPayload) {
  const listener = (_event, ...args) => callback(selectPayload(...args));
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('electronAPI', {
  setLanguage: (lang) => ipcRenderer.send('set-language', lang),
  onMenuAction: (callback) => subscribe('menu-action', callback, action => action),
  onOpenFile: (callback) => subscribe('open-file', callback, filePath => filePath),
  notifyRendererReady: () => ipcRenderer.send('renderer-ready'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  exportPDF: (payload) => ipcRenderer.invoke('export-pdf', payload),
  closeAllDocuments: () => ipcRenderer.send('close-all-documents'),
  showRecentDocs: () => ipcRenderer.send('open-recent-docs'),
  createNewDoc: () => ipcRenderer.send('create-new-doc'),
  onAllDocumentsClosed: (callback) => subscribe('all-documents-closed', callback, () => undefined),
  onShowWelcomeScreen: (callback) => subscribe('show-welcome-screen', callback, data => data)
});
