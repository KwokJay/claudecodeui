# Claude Code UI 桌面应用开发任务清单

基于《desktop-migration-plan.md》桌面迁移方案制定的详细开发任务清单。

## 总览

**目标：** 将现有Web应用改造为支持macOS和Windows的Electron桌面应用
**预估总时间：** 12-18小时（分布在1-2周内）
**技术栈：** Electron + React + Node.js (ESM模块系统)

## 阶段1: 环境准备和依赖安装 ⏱️ 30分钟

### 任务清单：
- [ ] 安装Electron相关依赖
  ```bash
  npm install --save-dev electron electron-builder concurrently wait-on fix-path
  ```
- [ ] 验证当前项目结构和依赖
- [ ] 创建electron目录结构
  ```bash
  mkdir electron
  ```

### 验收标准：
- 所有依赖成功安装
- electron目录已创建
- package.json中包含新增的devDependencies

## 阶段2: 后端服务改造 ⏱️ 2-3小时

### 核心任务：
- [ ] **修改 `server/index.js`**
  - 将启动逻辑封装为 `startServer()` 函数
  - 支持动态端口分配 (`port: 0`)
  - 保持独立运行兼容性
  - 返回实际监听端口号
  
  ```javascript
  // 示例代码结构
  export async function startServer({ port = 0, host = '127.0.0.1' } = {}) {
    // ... 现有逻辑
    return new Promise((resolve) => {
      server.listen(port, host, () => {
        const actualPort = server.address().port;
        resolve({ port: actualPort });
      });
    });
  }
  
  // 兼容独立运行
  if (import.meta.url === `file://${process.argv[1]}`) {
    startServer().catch(console.error);
  }
  ```

- [ ] **修改 `/api/config` 接口**
  - 基于 `req.headers.host` 动态生成 `wsUrl`
  - 适配动态端口模式

- [ ] **跨平台路径兼容性**
  - 将所有 `process.env.HOME` 替换为 `os.homedir()`
  - 检查文件监控路径处理

### 验收标准：
- `startServer()` 函数正常导出和工作
- 服务可以独立启动（`node server/index.js`）
- `/api/config` 返回正确的动态wsUrl
- 路径处理兼容Windows和macOS

## 阶段3: 配置文件调整 ⏱️ 1小时

### 任务清单：
- [ ] **更新 `package.json`**
  - 添加 `"main": "electron/main.mjs"`
  - 添加桌面开发脚本
  - 配置 `electron-builder` 构建选项
  - 设置 `asarUnpack` 原生模块
  
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
      "directories": { "output": "release" },
      "npmRebuild": true,
      "mac": { "target": "dmg" },
      "win": { "target": "nsis" }
    }
  }
  ```

- [ ] **调整 `vite.config.js`**
  - 统一代理端口配置
  - 确保 `/shell` 和 `/ws` 都指向同一后端端口

### 验收标准：
- package.json配置正确
- vite代理配置统一
- 脚本命令可以执行

## 阶段4: 创建Electron主进程 ⏱️ 2-3小时

### 核心文件：`electron/main.mjs`
- [ ] **基础窗口管理**
  - 创建主窗口 (1400x900)
  - 配置安全选项 (contextIsolation, sandbox)
  - 实现单实例锁定

- [ ] **开发/生产模式分离**
  - 开发模式：加载 Vite 服务器 (`localhost:5173`)
  - 生产模式：启动内置服务并加载本地页面

- [ ] **环境配置**
  - PATH 环境变量修复 (`fix-path`)
  - 设置用户数据目录 (`APP_DATA_DIR`)

- [ ] **安全设置**
  - 外链处理 (`shell.openExternal`)
  - 防止任意导航

### 参考实现：
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
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    try {
      const { port } = await startServer({ port: 0, host: '127.0.0.1' });
      win.loadURL(`http://127.0.0.1:${port}`);
    } catch (error) {
      console.error('Failed to start server or load URL:', error);
    }
  }
}

// 单实例锁定和应用生命周期管理
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

### 验收标准：
- Electron窗口正常启动
- 开发/生产模式切换正常
- 安全设置生效
- 单实例运行正常

## 阶段5: 数据存储路径改造 ⏱️ 1-2小时

### 任务清单：
- [ ] **修改 `server/database/db.js`**
  - 使用 `process.env.APP_DATA_DIR` 优先
  - 回退到 `os.homedir()/.claude-code-ui`
  - 确保目录创建逻辑

- [ ] **项目文件监控路径调整**
  - 检查 `setupProjectsWatcher()` 中的路径处理
  - 确保跨平台兼容性

### 示例代码：
```javascript
// server/database/db.js (示意)
import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';

const baseDir = process.env.APP_DATA_DIR || path.join(os.homedir(), '.claude-code-ui');
const DB_PATH = path.join(baseDir, 'auth.db');

// 确保目录存在
await fs.mkdir(baseDir, { recursive: true });
```

### 验收标准：
- 数据库文件创建在正确目录
- 跨平台路径处理正常
- 文件监控功能正常工作

## 阶段6: 开发环境测试 ⏱️ 2-3小时

### 测试流程：
- [ ] **独立Web模式测试**
  ```bash
  npm run dev:web
  ```
  - 验证前后端正常通信
  - 测试WebSocket连接
  - 验证文件操作功能

- [ ] **桌面开发模式测试**
  ```bash
  npm run dev:electron
  ```
  - 验证Electron窗口启动
  - 测试热更新功能
  - 验证开发者工具

- [ ] **功能完整性测试**
  - Claude/Cursor CLI集成
  - 文件树和编辑器
  - Git操作面板
  - 终端会话

### 验收标准：
- Web模式和桌面模式都正常工作
- 所有核心功能在桌面版本中正常
- 开发体验流畅（热更新等）

## 阶段7: 生产打包配置和测试 ⏱️ 3-4小时

### 任务清单：
- [ ] **构建测试**
  ```bash
  npm run build
  npm run dist
  ```

- [ ] **原生依赖验证**
  - 确认 `better-sqlite3` 正常工作
  - 确认 `node-pty` 终端功能
  - 验证 `asarUnpack` 配置

- [ ] **应用功能测试**
  - 数据库读写操作
  - CLI工具调用 (`claude`, `git`)
  - 文件系统访问权限
  - WebSocket通信

- [ ] **安全性验证**
  - 服务仅绑定 `127.0.0.1`
  - 外链正确跳转
  - 沙箱模式工作正常

### 验收标准：
- 安装包成功生成
- 打包后的应用功能完整
- 原生依赖正常工作
- 安全设置生效

## 阶段8: 跨平台兼容性测试 ⏱️ 2-3小时

### 测试范围：
- [ ] **macOS测试**
  - .dmg 安装包生成和安装
  - 系统权限和文件访问
  - Dock图标和菜单行为

- [ ] **Windows测试**
  - .exe 安装包生成和安装
  - 路径处理兼容性
  - 系统集成功能

- [ ] **性能和稳定性**
  - 内存使用监控
  - 启动时间测试
  - 长时间运行稳定性

### 验收标准：
- 两个平台的安装包都能正常生成和安装
- 所有功能在两个平台上都正常工作
- 性能指标符合预期

## 风险点和注意事项 ⚠️

### 高风险项目：
1. **原生模块重建** - `better-sqlite3`, `node-pty` 可能需要特殊处理
2. **PATH环境变量** - GUI应用可能找不到CLI工具
3. **文件权限** - 数据库写入权限和项目文件访问
4. **端口冲突** - 开发模式下的端口管理

### 应对策略：
- 提前测试原生模块的打包配置
- 使用 `fix-path` 确保环境变量正确
- 合理设置文件路径和权限
- 使用动态端口避免冲突

## 成功标准 ✅

- [ ] 桌面应用正常启动和运行
- [ ] 所有Web功能在桌面版本中正常工作
- [ ] Claude/Cursor CLI集成正常
- [ ] 数据持久化正常工作
- [ ] 跨平台安装包正常生成和分发
- [ ] 开发和生产环境都稳定运行

## 后续优化项目

完成基础桌面化后，可以考虑的增强功能：
- 系统托盘支持
- 全局快捷键
- 原生菜单栏
- 自动更新机制
- 更多系统集成功能

---

**创建时间：** 2024年
**基于方案：** desktop-migration-plan.md (最终修订版)
**维护者：** Claude Code UI 开发团队