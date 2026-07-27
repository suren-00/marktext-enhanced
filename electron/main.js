const { app, BrowserWindow, shell, Menu, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

let mainWindow;
let rendererReady = false;
let isQuitting = false;
const pendingOpenFiles = [];

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }
  if (process.platform === 'darwin') {
    app.focus({ steal: true });
  }
  mainWindow.focus();
}

function deliverOpenFile(filePath) {
  if (!filePath || pendingOpenFiles.includes(filePath)) {
    return;
  }

  if (!mainWindow || mainWindow.isDestroyed()) {
    pendingOpenFiles.push(filePath);

    // On macOS the app stays alive after its last window is closed. Recreate
    // the window so a later Finder open event has somewhere to display.
    if (app.isReady()) {
      createWindow();
    }
    return;
  }

  if (rendererReady) {
    focusMainWindow();
    mainWindow.webContents.send('open-file', filePath);
    return;
  }

  pendingOpenFiles.push(filePath);
  focusMainWindow();
}

function flushPendingOpenFiles() {
  if (!mainWindow || mainWindow.isDestroyed() || !rendererReady) {
    return;
  }

  while (pendingOpenFiles.length > 0) {
    mainWindow.webContents.send('open-file', pendingOpenFiles.shift());
  }
}

// macOS may emit this before app.whenReady(), so the listener must be
// registered before the window is created.
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  deliverOpenFile(filePath);
});

// Menu translations
const menuTranslations = {
  zh: {
    appName: 'OwlMark',
    file: '文件',
    newFile: '新建文件',
    open: '打开...',
    save: '保存',
    saveAs: '另存为...',
    close: '关闭',
    edit: '编辑',
    undo: '撤销',
    redo: '重做',
    cut: '剪切',
    copy: '复制',
    paste: '粘贴',
    selectAll: '全选',
    view: '视图',
    reload: '重新加载',
    forceReload: '强制重新加载',
    devTools: '开发者工具',
    actualSize: '实际大小',
    zoomIn: '放大',
    zoomOut: '缩小',
    fullscreen: '切换全屏',
    window: '窗口',
    minimize: '最小化',
    zoom: '缩放',
    front: '全部置于最前',
    hide: '隐藏',
    hideOthers: '隐藏其他',
    unhide: '全部显示',
    quit: '退出',
  },
  en: {
    appName: 'OwlMark',
    file: 'File',
    newFile: 'New File',
    open: 'Open...',
    save: 'Save',
    saveAs: 'Save As...',
    close: 'Close',
    edit: 'Edit',
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    selectAll: 'Select All',
    view: 'View',
    reload: 'Reload',
    forceReload: 'Force Reload',
    devTools: 'Developer Tools',
    actualSize: 'Actual Size',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    fullscreen: 'Toggle Full Screen',
    window: 'Window',
    minimize: 'Minimize',
    zoom: 'Zoom',
    front: 'Bring All to Front',
    hide: 'Hide',
    hideOthers: 'Hide Others',
    unhide: 'Show All',
    quit: 'Quit',
  }
};

function buildMenu(lang = 'zh') {
  const t = menuTranslations[lang] || menuTranslations.zh;
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac ? [{
      label: t.appName,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide', label: t.hide },
        { role: 'hideOthers', label: t.hideOthers },
        { role: 'unhide', label: t.unhide },
        { type: 'separator' },
        { role: 'quit', label: t.quit }
      ]
    }] : []),
    {
      label: t.file,
      submenu: [
        {
          label: t.newFile,
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu-action', 'new')
        },
        {
          label: t.open,
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu-action', 'open')
        },
        { type: 'separator' },
        {
          label: t.save,
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu-action', 'save')
        },
        {
          label: t.saveAs,
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow?.webContents.send('menu-action', 'saveAs')
        },
        { type: 'separator' },
        { role: 'close', label: t.close }
      ]
    },
    {
      label: t.edit,
      submenu: [
        { role: 'undo', label: t.undo },
        { role: 'redo', label: t.redo },
        { type: 'separator' },
        { role: 'cut', label: t.cut },
        { role: 'copy', label: t.copy },
        { role: 'paste', label: t.paste },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'selectAll', label: t.selectAll }
        ] : [
          { role: 'selectAll', label: t.selectAll }
        ])
      ]
    },
    {
      label: t.view,
      submenu: [
        { role: 'reload', label: t.reload },
        { role: 'forceReload', label: t.forceReload },
        { role: 'toggleDevTools', label: t.devTools },
        { type: 'separator' },
        { role: 'resetZoom', label: t.actualSize },
        { role: 'zoomIn', label: t.zoomIn },
        { role: 'zoomOut', label: t.zoomOut },
        { type: 'separator' },
        { role: 'togglefullscreen', label: t.fullscreen }
      ]
    },
    ...(isMac ? [{
      label: t.window,
      submenu: [
        { role: 'minimize', label: t.minimize },
        { role: 'zoom', label: t.zoom },
        { type: 'separator' },
        { role: 'front', label: t.front }
      ]
    }] : [])
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Listen for language change from renderer
ipcMain.on('set-language', (event, lang) => {
  buildMenu(lang);
});

function createWindow() {
  rendererReady = false;
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1050,
    minWidth: 900,
    minHeight: 650,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/icon.icns')
  });

  const startUrl = process.env.VITE_DEV_SERVER_URL || `file://${path.join(__dirname, '../dist/index.html')}`;
  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', focusMainWindow);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('close', (event) => {
    // Keep a reusable window while the macOS app remains running. This lets a
    // later Finder double-click reliably show the app again after the user
    // closes its window with the red traffic-light button.
    if (process.platform === 'darwin' && !isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    rendererReady = false;
    mainWindow = null;
  });
}

// Handle welcome screen actions
ipcMain.on('close-all-documents', () => {
  if (mainWindow) {
    mainWindow.webContents.send('all-documents-closed');
  }
});

ipcMain.on('open-recent-docs', () => {
  // This will be implemented in the renderer
  if (mainWindow) {
    mainWindow.webContents.send('show-welcome-screen', { showRecent: true });
  }
});

ipcMain.on('create-new-doc', () => {
  if (mainWindow) {
    mainWindow.webContents.send('create-blank-document');
  }
});

// Handle file reading
ipcMain.handle('read-file', async (event, filePath) => {
  if (typeof filePath !== 'string' || filePath.length === 0) {
    throw new TypeError('A valid file path is required');
  }

  try {
    const text = await fs.promises.readFile(filePath, 'utf-8');
    return text;
  } catch (error) {
    console.error('Failed to read file:', error);
    throw error;
  }
});

// Render sanitized HTML in a hidden window and let Electron create the PDF.
// Using a native print pipeline avoids window.open(), which is intentionally
// blocked by setWindowOpenHandler for ordinary external links.
ipcMain.handle('export-pdf', async (_event, payload = {}) => {
  if (typeof payload.html !== 'string' || payload.html.length === 0) {
    throw new TypeError('PDF content is required');
  }

  const sourceName = typeof payload.fileName === 'string' ? payload.fileName : '未命名.md';
  const baseName = sourceName.replace(/\.[^/.]+$/, '') || '未命名';
  const defaultName = `${baseName}.pdf`;
  const saveOptions = {
    title: '导出 PDF',
    defaultPath: path.join(app.getPath('documents'), defaultName),
    filters: [{ name: 'PDF 文件', extensions: ['pdf'] }]
  };
  const saveResult = mainWindow && !mainWindow.isDestroyed()
    ? await dialog.showSaveDialog(mainWindow, saveOptions)
    : await dialog.showSaveDialog(saveOptions);

  if (saveResult.canceled || !saveResult.filePath) {
    return { canceled: true };
  }

  let printWindow;
  try {
    printWindow = new BrowserWindow({
      show: false,
      width: 1200,
      height: 900,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true
      }
    });

    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(payload.html)}`;
    await printWindow.loadURL(dataUrl);
    const pdfBuffer = await printWindow.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    const outputPath = saveResult.filePath.toLowerCase().endsWith('.pdf')
      ? saveResult.filePath
      : `${saveResult.filePath}.pdf`;
    await fs.promises.writeFile(outputPath, pdfBuffer);
    return { canceled: false, filePath: outputPath };
  } catch (error) {
    console.error('Failed to export PDF:', error);
    throw new Error(`PDF 导出失败：${error.message}`);
  } finally {
    if (printWindow && !printWindow.isDestroyed()) {
      printWindow.close();
    }
  }
});

ipcMain.on('renderer-ready', () => {
  rendererReady = true;
  focusMainWindow();
  flushPendingOpenFiles();
});

app.whenReady().then(() => {
  buildMenu('zh'); // Default to Chinese
  createWindow();

  // On macOS, handle opening files even when app is already running
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      focusMainWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
