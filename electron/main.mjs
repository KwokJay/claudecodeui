// Electron 主进程 - Claude Code UI 桌面应用
import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
let mainWindow = null;
let serverPort = null;

async function createWindow() {
  console.log('🪟 Creating Electron window...');
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../public/app-icon.svg'),
    titleBarStyle: 'default',
    show: false // Don't show until ready-to-show
  });

  // Handle external links
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent navigation to external sites
  win.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'http://localhost:5173' && 
        parsedUrl.origin !== `http://127.0.0.1:${serverPort}`) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  if (isDev) {
    // 开发模式：加载 Vite 服务器（假设外部已启动服务端和Vite）
    console.log('🔧 Development mode: Loading Vite dev server');
    try {
      console.log('📡 Attempting to load http://localhost:5173');
      await win.loadURL('http://localhost:5173');
      console.log('✅ Successfully loaded Vite dev server');
      win.webContents.openDevTools();
    } catch (error) {
      console.error('❌ Failed to load Vite dev server. Make sure to run "npm run server" and "npm run client" first.');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      
      // 显示错误页面而不是退出
      const errorHtml = `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
            <h1>开发模式启动错误</h1>
            <p>无法连接到 Vite 开发服务器</p>
            <p>错误信息: ${error.message}</p>
            <p>请确保已启动：</p>
            <ul style="text-align: left; display: inline-block;">
              <li>npm run server (后端服务器)</li>
              <li>npm run client (Vite开发服务器)</li>
            </ul>
            <button onclick="location.reload()">重试</button>
          </body>
        </html>
      `;
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
    }
  } else {
    // 生产模式：启动内置服务并加载
    try {
      console.log('🚀 Production mode: Starting internal server');
      
      // 动态导入服务器模块以避免初始化时的better-sqlite3错误
      const { startServer } = await import('../server/index.js');
      
      // 确保startServer函数存在
      if (!startServer) {
        throw new Error('Server module not loaded');
      }
      
      const result = await startServer({ port: 0, host: '127.0.0.1' });
      if (!result || !result.port) {
        throw new Error('Server failed to return port information');
      }
      
      serverPort = result.port;
      console.log(`✅ Internal server started on port ${serverPort}`);
      
      const serverUrl = `http://127.0.0.1:${serverPort}`;
      console.log(`🔗 Loading URL: ${serverUrl}`);
      await win.loadURL(serverUrl);
      
    } catch (error) {
      console.error('❌ Failed to start server or load URL:', error);
      console.error('❌ Stack trace:', error.stack);
      
      // Show error dialog
      const { dialog } = await import('electron');
      dialog.showErrorBox('启动错误', `无法启动内置服务器:\n${error.message}\n\n请检查控制台日志获取更多信息。`);
      
      // 尝试显示错误页面
      const errorHtml = `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
            <h1>启动错误</h1>
            <p>无法启动内置服务器</p>
            <p>错误信息: ${error.message}</p>
            <button onclick="location.reload()">重试</button>
          </body>
        </html>
      `;
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
    }
  }

  // Show window when ready
  win.once('ready-to-show', () => {
    win.show();
    
    // Focus on macOS
    if (process.platform === 'darwin') {
      app.dock.show();
    }
  });

  return win;
}

// 单实例锁定
console.log('🔐 Requesting single instance lock...');
if (!app.requestSingleInstanceLock()) {
  console.log('❌ Another instance is already running, quitting...');
  app.quit();
} else {
  console.log('✅ Single instance lock acquired');
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    console.log('🚀 App is ready, initializing...');
    if (!isDev) {
      // 生产模式：修复 PATH 环境变量
      try {
        const fixPath = (await import('fix-path')).default;
        fixPath();
        console.log('✅ PATH environment fixed for GUI');
      } catch (e) {
        console.error('❌ Failed to fix PATH:', e);
      }
      
      // 设置用户数据目录环境变量
      process.env.APP_DATA_DIR = app.getPath('userData');
      console.log('📁 User data directory:', process.env.APP_DATA_DIR);
    }
    
    console.log('🪟 About to create main window...');
    mainWindow = await createWindow();
    console.log('✅ Main window created successfully');
    
    // macOS 应用激活处理
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else if (mainWindow) {
        mainWindow.show();
      }
    });
  });
}

// 应用生命周期管理
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 处理证书错误（开发环境）
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (isDev) {
    // 在开发环境中忽略证书错误
    event.preventDefault();
    callback(true);
  } else {
    // 在生产环境中使用默认行为
    callback(false);
  }
});

// 安全：阻止新窗口创建
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

console.log('🖥️ Electron main process initialized');
console.log('🔧 Development mode:', isDev);
console.log('📍 User data path:', app.getPath('userData'));