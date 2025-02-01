const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, listener) => ipcRenderer.on(channel, (event, ...args) => listener(...args)),
  saveFile: (filePath, content) => ipcRenderer.invoke('save-file', filePath, content),
}); 

// Debug log when script loads
console.log('🔵 Preload script is loading...');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
try {
  contextBridge.exposeInMainWorld('electron', {
    invoke: (channel, ...args) => {
      const validChannels = ['terminal-command'];
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, ...args);
      }
      return Promise.reject(new Error(`Channel "${channel}" is not allowed`));
    },
    on: (channel, listener) => {
      const validChannels = ['terminal-output'];
      if (validChannels.includes(channel)) {
        // Add the listener and return a cleanup function
        ipcRenderer.on(channel, listener);
        return () => ipcRenderer.removeListener(channel, listener);
      }
      throw new Error(`Channel "${channel}" is not allowed`);
    },
  });
  console.log('✅ Electron API exposed successfully!');
} catch (error) {
  console.error('❌ Failed to expose Electron API:', error);
  console.error(error);
}