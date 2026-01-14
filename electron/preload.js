const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('db', {
  get: (key) => ipcRenderer.invoke('db-get', key),
  set: (key, value) => ipcRenderer.invoke('db-set', key, value),
  clear: () => ipcRenderer.invoke('db-clear'),
  backup: (suffix) => ipcRenderer.invoke('db-backup', suffix),
});

contextBridge.exposeInMainWorld('electronAPI', {
  sendMessage: (channel, data) => ipcRenderer.send(channel, data),
  onMessage: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args)),
});
