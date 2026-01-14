const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = !app.isPackaged;

// Initialize Database Storage with Security
let Store;
(async () => {
    const { default: ElectronStore } = await import('electron-store');
    Store = new ElectronStore({
        encryptionKey: 'T1T_Secure_System_2025_Key_#Adham' // Encrypts the local JSON file
    });
})();

// Hardware Acceleration for smoother animations
app.disableHardwareAcceleration(); // Sometimes disabling it fixes lag on certain Macs, but let's try force-enabling first or leave default.
// Actually, let's keep default but ensure no extra overhead.

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 850,
    show: false, 
    backgroundColor: '#ffffff',
    icon: path.join(__dirname, '../public/assets/logo.png'), // Sets the taskbar icon
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, 
      contextIsolation: true,
      sandbox: true,
      devTools: isDev,
      backgroundThrottling: false // Keep performance high even when blurred
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#00000000',
      symbolColor: '#1e293b'
    }
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  if (isDev) {
    // Try to load the most common Vite port
    win.loadURL('http://localhost:5173').catch(() => {
        // Fallback if port changed
        win.loadURL('http://localhost:5174');
    });
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// Database IPC Handlers
ipcMain.handle('db-get', (event, key) => {
    return Store.get(key);
});

ipcMain.handle('db-set', (event, key, value) => {
    Store.set(key, value);
    return true;
});

ipcMain.handle('db-clear', () => {
    Store.clear();
    return true;
});

// Professional Auto-Backup System
ipcMain.handle('db-backup', async (event, suffix = 'manual') => {
    try {
        const storePath = Store.path;
        const backupDir = path.join(app.getPath('userData'), 't1t_backups');
        
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `backup_${suffix}_${timestamp}.json`);
        
        fs.copyFileSync(storePath, backupPath);
        console.log('✅ Backup created at:', backupPath);
        return { success: true, path: backupPath };
    } catch (err) {
        console.error('❌ Backup failed:', err);
        return { success: false, error: err.message };
    }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
