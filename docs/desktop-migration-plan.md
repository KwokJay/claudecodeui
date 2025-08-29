# Electron 桌面应用改造方案 (最终修订版)

本文档根据项目实际情况及多轮深入的可行性分析，详细阐述了将 Claude Code UI Web 项目改造为支持 macOS 和 Windows 的跨平台桌面应用的技术方案。

## 1. 目标

将现有的 React + Node.js 全栈项目打包成一个独立的、高性能且健壮的桌面应用程序，提供与Web版本一致的功能体验，并确保其在不同操作系统上稳定运行。

## 2. 核心策略

1.  **架构**:
    -   **主进程 (Main Process)**: 使用与项目一致的 **ESM 模块系统** (`electron/main.mjs`)。它负责窗口创建、单实例锁定、安全设置等原生交互。
    -   **渲染进程 (Renderer Process)**: 现有的 React 应用将运行在此。**前端代码无需修改**，继续使用相对路径 (`/api/...`) 发起请求。

2.  **服务与加载方式**:
    -   **生产模式 (Production)**: Electron 主进程将启动内置的 Node.js 服务，该服务监听一个由系统分配的**动态端口** (`127.0.0.1:0`)。应用窗口通过 `loadURL` 加载由该服务托管的前端页面。
    -   **开发模式 (Development)**: 为了利用 Vite 的热更新（HMR）功能，开发流程将分离。我们将独立运行后端服务（`npm run server`），Vite 开发服务器（`npm run client`）负责提供前端资源并将其 API 请求代理到后端服务。Electron 应用仅加载 Vite 的 URL (`http://localhost:5173`)，**此时主进程不启动内置服务**，以避免冲突。

3.  **数据与环境**:
    -   **数据库存储**: SQLite 等持久化数据将被存储在用户数据目录 (`app.getPath('userData')`)，确保应用的可写权限。
    -   **`PATH` 环境变量**: 主进程将自动修复GUI环境下的`PATH`变量，确保 `claude`、`git` 等命令行工具可被正确调用。
    -   **HOME 路径**: 代码中将统一使用 `os.homedir()` 代替 `process.env.HOME` 以保证跨平台兼容性。

4.  **打包与原生依赖**:
    -   使用 `electron-builder` 打包，并配置 `asarUnpack` 来正确处理 `better-sqlite3` 等原生Node模块。

## 3. 详细步骤

### 3.1. 环境与依赖设置

安装或更新开发依赖。

```bash
npm install --save-dev electron electron-builder concurrently wait-on fix-path
```

### 3.2. 调整项目脚本 (`package.json`)

采用清晰分离的脚本，分别对应Web开发、桌面开发和生产打包。

```json
{
  "type": "module",
  "main": "electron/main.mjs",
  "scripts": {
    "server": "node server/index.js",
    "client": "vite",
    "dev:web": "concurrently --kill-others \"npm:server\" \"npm:client\"",
    "build": "vite build",
    "dev:electron": "concurrently --kill-others \"npm:server\" \"npm:client\" \"wait-on tcp:3001 && wait-on http://localhost:5173 && electron .\"",
    "dist": "npm run build && electron-builder"
  },
  "build": {
    "appId": "com.yourcompany.claudecodeui",
    "productName": "Claude Code UI",
    "files": [
      "dist/**/*",
      "server/**/*",
      "electron/main.mjs",
      "package.json"
    ],
    "asarUnpack": [
      "**/node_modules/better-sqlite3/**",
      "**/node_modules/node-pty/**"
    ],
    "directories": {
      "output": "release"
    },
    "npmRebuild": true,
    "mac": {
      "target": "dmg"
    },
    "win": {
      "target": "nsis"
    }
  }
}
```

### 3.3. 改造后端服务

-   **`server/index.js`**: 改造为导出 `startServer` 启动函数，并使其兼容独立运行。
-   **`/api/config` 接口**: 修改此接口，使其基于 `req.headers.host` 动态生成 `wsUrl`，以适应动态端口。
-   **开发模式重定向**: 修复开发模式下，当后端接收到非API请求时的回退端口，应指向Vite的 `5173` 端口。

### 3.4. 改造 `vite.config.js`

统一开发模式下的代理端口，确保所有API和WebSocket请求都指向同一个后端服务端口（例如 `3001`）。

### 3.5. 创建Electron主进程 (`electron/main.mjs`)

此文件是桌面应用的核心，其逻辑将区分开发和生产环境。

```javascript
// electron/main.mjs
import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import { startServer } from '../server/index.js';

const isDev = process.env.NODE_ENV !== 'production';

async function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    // 开发模式：加载Vite服务器，后端服务已独立启动
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    // 生产模式：启动内置后端，并加载由它托管的前端
    try {
      const { port } = await startServer({ port: 0, host: '127.0.0.1' });
      win.loadURL(`http://127.0.0.1:${port}`);
    } catch (error) {
      console.error('Failed to start server or load URL:', error);
    }
  }
}

// 确保单实例运行
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(async () => {
    if (!isDev) {
      // 生产模式：修复PATH并设置数据目录
      try {
        const fixPath = (await import('fix-path')).default;
        fixPath();
      } catch (e) {
        console.error('Failed to fix PATH', e);
      }
      process.env.APP_DATA_DIR = app.getPath('userData');
    }
    createWindow();
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
```

### 3.6. 改造数据存储与文件路径

-   **`server/database/db.js`**: 修改数据库文件路径，使其优先使用 `process.env.APP_DATA_DIR`。
-   **全局审查**: 检查项目中所有 `process.env.HOME` 的使用，替换为 `os.homedir()`，并对文件监控等路径进行健壮性调整。

## 4. 开发与构建流程

-   **桌面开发**: `npm run dev:electron`
    -   此命令会同时启动后端服务、Vite前端服务和Electron应用。开发体验流畅，支持热更新。
-   **Web开发**: `npm run dev:web`
    -   保留纯Web开发模式，便于快速调试UI和API。
-   **生产打包**: `npm run dist`
    -   构建前端资源，然后将所有部分打包成一个可安装的应用。

## 5. 上线前检查清单

- [ ] **CLI可用性**: 确保 `claude`、`git` 等在打包应用中可被调用。
- [ ] **数据库读写**: 确认数据库在用户数据目录中成功读写。
- [ ] **网络与安全**: 确认服务仅监听 `127.0.0.1`，外链被正确拦截。
- [ ] **原生依赖**: 确认打包产物中的原生模块工作正常。
- [ ] **跨平台路径**: 确认所有路径处理都兼容Windows和macOS。
