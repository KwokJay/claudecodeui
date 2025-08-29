# Electron 桌面改造可行性与问题清单（含本地服务启动）

本文基于当前代码库实际情况与《desktop-migration-plan.md》的方案，给出可行性结论、关键改进点与落地清单。注意：本仓库已包含服务端（`/server`），桌面形态应在本地启动该服务并通过 HTTP/WebSocket 通信。

## 0. 适用范围说明
- 当前仓库包含：
  - 前端：React + Vite（`/src`）
  - 本地服务：Express + WebSocket（`/server`）
- 桌面化（Electron）时，应在主进程内启动本地服务（建议仅绑定 `127.0.0.1` 的动态端口），渲染进程通过相对路径请求（继续使用 `/api` 与 `/api/config` 动态发现 WS 基址）。

## 1. 总体可行性
- 采用 Electron 封装 + 本地 Express 服务的方案是可行的，且改动量适中。
- 建议维持现有前端相对路径与 `/api/config` 能力，无需前端硬编码 `http://localhost:3001`。
- 关键风险集中在：模块格式（ESM/CJS）统一、生产加载方式、动态端口与单实例、数据库落盘目录、原生依赖重建与 asar 解包、PATH 环境与跨平台路径。

## 2. 关键架构建议（落地导向）
- 主进程使用 ESM（例如 `electron/main.mjs`），与项目一致（`"type": "module"`）。
- 主进程启动本地服务：传入 `port: 0` 获取系统分配端口，仅监听 `127.0.0.1`；完成后用 `BrowserWindow.loadURL('http://127.0.0.1:<port>')` 加载 UI（生产与开发一致走 HTTP），避免 `file://` 下相对请求失效。
- 仍由服务端静态托管打包后的前端（`/dist`），渲染进程所有 `fetch('/api/...')` 与 WS 由 `/api/config` 返回的 `wsUrl` 自动对齐。
- 将数据库写入路径改为用户数据目录（Electron `app.getPath('userData')` 传入服务端，通过环境变量 `APP_DATA_DIR`）。
- 注入完整用户 PATH（如使用 `fix-path`/`shell-env`），保证 `claude`、`cursor-agent` 等 CLI 可被找到。

## 3. 问题清单与改进建议

### 3.1 模块系统（ESM/CJS）统一
- 现状：项目是 ESM（`"type": "module"`），`server/index.js` 使用 `import`，且加载即启动服务。
- 建议：
  1) 将服务端改造为“导出启动函数，不自动启动”；
  2) 主进程（ESM）`import { startServer } from './server/index.js'` 启动。

示例（服务端导出启动函数，兼容独立运行）：
```js
// server/index.js（示意）
export async function startServer({ port = process.env.PORT || 0, host = '127.0.0.1', env = {} } = {}) {
  // ...按现有逻辑创建 app/server/wss
  // 使用 host + 动态端口
  return new Promise((resolve, reject) => {
    server.listen(port, host, async () => {
      const address = server.address();
      const actualPort = typeof address === 'object' ? address.port : port;
      // 启动项目监控等
      await setupProjectsWatcher();
      resolve({ port: actualPort });
    }).on('error', reject);
  });
}

// 兼容直接 node server/index.js 运行
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch(err => { console.error(err); process.exit(1); });
}
```

### 3.2 生产加载方式：统一走 HTTP 而非 file://
- 现状计划：生产用 `loadFile('dist/index.html')`。
- 风险：`file://` 下相对路径 `fetch('/api')` 与 `/api/config` 将失效。
- 建议：生产也使用 `win.loadURL('http://127.0.0.1:<动态端口>')`，由本地服务托管前端与 API。

主进程示例（ESM）：
```js
// electron/main.mjs（示意）
import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import os from 'os';
import { startServer } from '../server/index.js';

let win;

function createWindow(port) {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
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

  win.loadURL(`http://127.0.0.1:${port}`);
}

app.whenReady().then(async () => {
  const single = app.requestSingleInstanceLock();
  if (!single) return app.quit();

  // 注入用户数据路径给服务端（DB 可写目录）
  process.env.APP_DATA_DIR = app.getPath('userData');

  // 可选：修复 PATH（macOS GUI 环境常见）
  try { (await import('fix-path')).default(); } catch {}

  const { port } = await startServer({ port: 0, host: '127.0.0.1' });
  createWindow(port);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(port);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

### 3.3 动态端口 + 单实例
- 避免固定 `3001` 端口冲突；使用 `port: 0` 并将实际端口传给渲染窗口。
- 使用 `app.requestSingleInstanceLock()` 防止多个实例竞争端口。

### 3.4 数据库存储目录不可写
- 现状：`server/database/db.js` 将 SQLite 放在打包资源路径（不可写）。
- 建议：通过 `process.env.APP_DATA_DIR` 将 DB 移至用户数据目录。例如：
```js
// server/database/db.js（要点示意）
import os from 'os';
import path from 'path';
const baseDir = process.env.APP_DATA_DIR || path.join(os.homedir(), '.claude-code-ui');
const DB_PATH = path.join(baseDir, 'auth.db');
// 确保 baseDir 存在后再打开 DB
```

### 3.5 原生依赖重建与 asar 解包
- 依赖含 `better-sqlite3`、`node-pty`（原生模块）。
- 建议：
  - `electron-builder` 开启 `npmRebuild: true`，或 `afterPack` 执行 `electron-rebuild`；
  - 在构建配置中 `asarUnpack` 指定 `**/better-sqlite3/**`、`**/node-pty/**`，避免加载失败。

### 3.6 PATH 环境与 CLI 可用性
- GUI 应用下 PATH 可能不含用户 Shell 的路径，导致找不到 `claude`、`cursor-agent`。
- 建议：主进程修复 PATH（`fix-path`/`shell-env`），并将合并后的 `process.env` 传递给子进程（当前代码已基于 `process.env`，主进程修复后即可受益）。

### 3.7 HOME 路径的跨平台性
- 现状：使用 `process.env.HOME`。
- 建议：统一改为 `os.homedir()`，兼容 Windows。

### 3.8 Vite 代理与开发重定向
- 现状：`vite.config.js` 中 `/shell` 代理到 3002，但服务端将 `/ws` 与 `/shell` 均挂到同一端口。
- 建议：统一代理到同一端口（如 `PORT || 3001`）。
- 现状：开发模式下服务端的 `app.get('*')` 默认重定向端口使用 `VITE_PORT || 3001`，未设置时应回退到 `5173`。
- 建议：回退端口改为 `5173`。

### 3.9 安全设置
- 渲染进程关闭 `nodeIntegration`，开启 `contextIsolation` 与 `sandbox`。
- 外链统一 `shell.openExternal` 打开，阻止 `window.open` 导致任意导航。

### 3.10 `/api/config` 与前端基址
- 建议保留 `/api/config` 返回 `{ wsUrl }` 的能力，前端继续使用相对路径 `fetch('/api/...')` 与动态 WS 基址，避免硬编码主机名与端口。

### 3.11 绑定地址
- 服务端在桌面模式仅绑定 `127.0.0.1`，避免被局域网访问；开发 Web 模式可继续 `0.0.0.0` 视需求而定。

### 3.12 代码风格与健壮性（可选优化）
- 将 `const PORT = ...` 前移至文件顶部，避免闭包对未初始化常量的潜在困惑（尽管运行期无实际问题）。

## 4. 开发与打包脚本建议（示例）

`package.json` 片段（示例，无注释）：
```json
{
  "type": "module",
  "main": "electron/main.mjs",
  "scripts": {
    "dev:web": "concurrently --kill-others \"npm run server\" \"npm run client\"",
    "server": "node server/index.js",
    "client": "vite --host",
    "build:web": "vite build",
    "dev:electron": "concurrently --kill-others \"vite\" \"wait-on http://localhost:5173 && electron .\"",
    "dist": "npm run build:web && electron-builder"
  },
  "build": {
    "appId": "com.example.claudecodeui",
    "productName": "Claude Code UI",
    "files": [
      "dist/**/*",
      "server/**/*",
      "electron/main.mjs",
      "package.json"
    ],
    "asarUnpack": [
      "**/better-sqlite3/**",
      "**/node-pty/**"
    ],
    "directories": { "output": "release" },
    "npmRebuild": true,
    "mac": { "target": "dmg" },
    "win": { "target": "nsis" },
    "nsis": { "oneClick": false, "allowToChangeInstallationDirectory": true }
  }
}
```

说明：
- 桌面开发模式使用 `dev:electron`，Vite 提供热更新，主进程加载 `http://localhost:5173`。
- 生产打包使用 `dist`，Electron 启动后由本地服务托管 `dist` 并用动态端口加载。

## 5. 上线前检查清单（精简）
- CLI 可用：`claude` / `cursor-agent` 在 Electron 环境可执行（PATH 已修复）。
- DB 可写：用户数据目录成功写入 SQLite，首次运行初始化成功。
- WS/HTTP：`/api/config` 返回的 `wsUrl` 可连接；`/ws` 与 `/shell` 工作正常。
- 文件监控：`os.homedir()` 路径在 Win/macOS 均正常；chokidar 无异常。
- 原生依赖：`better-sqlite3`、`node-pty` 在打包产物中可加载（asarUnpack/重建就绪）。
- 安全：`contextIsolation`/`sandbox` 已启用；外链经 `shell.openExternal`；服务仅监听 `127.0.0.1`。

---
以上清单已结合“若存在服务端则在本地启动”的要求与现有代码实际情况进行整理，可直接作为改造执行与验收的依据。