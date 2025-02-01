const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // ✅ Ensure this is correct
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL('http://localhost:5173'); // Adjust if needed

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
});

// 📝 Handle File Savingconst { app, BrowserWindow, ipcMain, dialog } = require('electron');
ipcMain.handle('save-file', async (event, filePath, content) => {
  const absoluteFilePath = path.resolve(filePath); // ✅ Ensures absolute path

  console.log(`💾 Saving file to: ${absoluteFilePath}`); // Debugging

  try {
    if (!fs.existsSync(absoluteFilePath)) {
      console.error('❌ File does not exist:', absoluteFilePath);
      return { success: false, error: 'File does not exist.' };
    }

    fs.writeFileSync(absoluteFilePath, content, 'utf-8');
    console.log(`✅ File saved successfully: ${absoluteFilePath}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error saving file:', error);
    return { success: false, error: error.message };
  }
});


// 💻 Handle Terminal Command Execution
let shellProcess = spawn(process.platform === 'win32' ? 'cmd.exe' : 'bash', [], {
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true
});

// Store ongoing output
let shellOutput = "";

shellProcess.stdout.on('data', (data) => {
  shellOutput += data.toString();
});

shellProcess.stderr.on('data', (data) => {
  shellOutput += data.toString();
});

ipcMain.handle('terminal-command', async (event, command) => {
  return new Promise((resolve) => {
    shellOutput = ""; // Clear previous output

    shellProcess.stdin.write(command + "\n"); // Send command

    setTimeout(() => {
      // Split output into lines
      let lines = shellOutput.trim().split("\n");

      // Remove the first and last line if there are at least two lines
      if (lines.length > 1) {
        lines = lines.slice(1, -1);
      }

      // Join back into a single output string
      resolve(lines.join("\n") || "No output");
    }, 500); // Small delay to capture output
  });
});
