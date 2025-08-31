# Claude Code 命令系统文档

本文档详细介绍 Claude Code UI Desktop 应用中集成的 Claude Code 命令系统功能。

## 概述

Claude Code 命令系统为用户提供了直接在聊天界面中使用 Claude Code 斜杠命令的能力，包括自动完成、智能搜索和自定义命令管理功能。

## 核心功能

### 1. 斜杠命令自动完成

**触发方式**: 在聊天输入框中输入 `/`

**功能特性**:
- 实时命令过滤和搜索
- 键盘导航支持（↑↓ 方向键）
- Tab 或 Enter 键选择命令
- Escape 键取消命令菜单
- 自动插入选中的命令到输入框

### 2. 预定义命令库

应用内置了 16 个 Claude Code 核心命令，分为 9 个类别：

#### 开发命令 (Development)
- **`/build`** 🔨 - 构建项目并检测框架
  - 示例: `/build`, `/build --target web`
  - 标志: `--target`, `--framework`, `--optimize`
  - Wave 功能: 启用

- **`/implement`** ⚡ - 实现功能和代码
  - 示例: `/implement user login`, `/implement @components/Button`
  - 标志: `--type`, `--framework`
  - Wave 功能: 启用

#### 分析命令 (Analysis)
- **`/analyze`** 🔍 - 多维度代码和系统分析
  - 示例: `/analyze architecture`, `/analyze --focus performance`
  - 标志: `--focus`, `--scope`, `--depth`
  - Wave 功能: 启用

- **`/troubleshoot`** 🚨 - 问题调查和故障排除
  - 示例: `/troubleshoot login error`
  - 标志: `--focus`, `--trace`, `--debug`

- **`/explain`** 💡 - 教育性解释和说明
  - 示例: `/explain React hooks`, `/explain @src/auth.js`
  - 标志: `--detailed`, `--simple`

#### 质量命令 (Quality)
- **`/improve`** 📈 - 基于证据的代码增强
  - 示例: `/improve performance`, `/improve @src/api --focus security`
  - 标志: `--focus`, `--iterative`, `--validate`
  - Wave 功能: 启用

- **`/cleanup`** 🧹 - 项目清理和技术债务减少
  - 示例: `/cleanup unused`, `/cleanup @src/legacy`
  - 标志: `--scope`, `--aggressive`

#### 测试命令 (Testing)
- **`/test`** 🧪 - 测试工作流
  - 示例: `/test unit`, `/test e2e --browser chrome`
  - 标志: `--type`, `--browser`, `--coverage`

#### 文档命令 (Documentation)
- **`/document`** 📚 - 文档生成
  - 示例: `/document API`, `/document @src/components`
  - 标志: `--type`, `--language`

#### 计划命令 (Planning)
- **`/estimate`** ⏱️ - 基于证据的估算
  - 示例: `/estimate new feature`, `/estimate @src/refactor`
  - 标志: `--complexity`, `--resources`

- **`/task`** 📋 - 长期项目管理
  - 示例: `/task create "User authentication"`, `/task list`
  - 标志: `--priority`, `--assign`
  - Wave 功能: 启用

#### 版本控制命令 (Version Control)
- **`/git`** 🌿 - Git工作流助手
  - 示例: `/git commit`, `/git merge --branch feature`
  - 标志: `--branch`, `--message`, `--force`

#### 设计命令 (Design)
- **`/design`** 🎨 - 设计编排
  - 示例: `/design UI mockup`, `/design architecture --system`
  - 标志: `--system`, `--component`, `--responsive`
  - Wave 功能: 启用

#### 元命令 (Meta)
- **`/index`** 🗂️ - 命令目录浏览
  - 示例: `/index search`, `/index --category Development`
  - 标志: `--category`, `--search`

- **`/load`** 📂 - 项目上下文加载
  - 示例: `/load @project`, `/load --recursive`
  - 标志: `--recursive`, `--filter`

### 3. 自定义命令管理

#### 用户级命令
- **范围**: 全局，跨所有项目可用
- **存储**: `localStorage` 键 `claude-user-commands`
- **用途**: 个人常用命令和工作流

#### 项目级命令  
- **范围**: 特定项目内可用
- **存储**: `localStorage` 键 `claude-project-commands-${projectName}`
- **用途**: 项目特定的命令和工具

#### 管理界面
通过 **设置 → Commands** 标签页管理自定义命令：
- 创建新命令（指定名称、描述、类别、图标等）
- 编辑现有命令
- 删除不需要的命令
- 在用户级和项目级之间切换

## 技术实现

### 核心文件结构

```
src/
├── utils/
│   └── claudeCommands.js          # 命令定义和管理系统
├── components/
│   ├── ChatInterface.jsx          # 斜杠命令检测和UI
│   ├── CommandManager.jsx         # 自定义命令管理界面
│   └── ToolsSettings.jsx          # 设置面板集成
```

### 关键实现细节

#### 命令检测逻辑
```javascript
// 检测 / 符号位置
const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
const isValidSlashPosition = lastSlashIndex === 0 || 
  (lastSlashIndex > 0 && textBeforeSlash.endsWith(' '));
```

#### 命令搜索和过滤
```javascript
// 多维度评分算法
calculateScore(command, searchTerm) {
  let score = 0;
  if (command.name.toLowerCase().includes(searchTerm)) score += 100;
  if (command.description.toLowerCase().includes(searchTerm)) score += 50;
  if (command.category.toLowerCase().includes(searchTerm)) score += 30;
  return score;
}
```

#### 存储架构
```javascript
// 用户级命令存储
localStorage.setItem('claude-user-commands', JSON.stringify(userCommands));

// 项目级命令存储  
localStorage.setItem(`claude-project-commands-${projectName}`, 
  JSON.stringify(projectCommands));
```

## 使用指南

### 基本使用
1. 在聊天输入框中输入 `/`
2. 浏览出现的命令列表
3. 使用方向键导航或直接输入搜索
4. 按 Tab 或 Enter 选择命令
5. 命令会自动插入到输入框中

### 高级功能
- **组合使用**: `/build @src/components --framework react`
- **带标志**: `/analyze --focus performance --scope module`
- **文件引用**: `/document @README.md --language zh`

### 自定义命令创建
1. 打开应用设置
2. 切换到 "Commands" 标签页
3. 选择 "用户级" 或 "项目级"
4. 点击 "添加命令"
5. 填写命令信息并保存

## 扩展性

### 添加新的预定义命令
编辑 `src/utils/claudeCommands.js` 中的 `CLAUDE_COMMANDS` 数组：

```javascript
{
  id: 'new-command',
  name: '/newcmd',
  category: 'Custom',
  description: '新命令描述',
  purpose: 'Command purpose',
  icon: '🎯',
  examples: ['/newcmd example'],
  flags: ['--flag1', '--flag2'],
  waveEnabled: false,
  autoActivates: ['SomePersona']
}
```

### 新增命令类别
在 `COMMAND_CATEGORIES` 对象中添加新类别：

```javascript
'NewCategory': { 
  color: 'blue', 
  icon: '🎯', 
  description: '新类别描述' 
}
```

## 兼容性

- **React 18+**: 使用现代 React 功能
- **本地存储**: 需要浏览器支持 localStorage
- **键盘事件**: 支持标准键盘导航
- **移动端**: 触摸友好的界面设计

## 性能优化

- **防抖搜索**: 避免过度的搜索计算
- **虚拟滚动**: 大量命令时的性能优化
- **缓存机制**: 命令搜索结果缓存
- **懒加载**: 按需加载命令详情

## 故障排除

### 常见问题

**命令菜单不显示**:
- 检查是否正确输入 `/`
- 确保光标位置在正确位置
- 验证 JavaScript 控制台是否有错误

**自定义命令丢失**:
- 检查浏览器本地存储设置
- 确认项目名称匹配
- 验证 JSON 数据完整性

**键盘导航失效**:
- 确保焦点在输入框中
- 检查键盘事件监听器
- 验证浏览器兼容性

### 调试步骤
1. 打开浏览器开发者工具
2. 检查控制台错误信息
3. 查看本地存储数据
4. 验证组件状态变化
5. 测试事件处理器

## 更新历史

### v1.0.0 (2025-08-31)
- ✅ 初始实现斜杠命令系统
- ✅ 16个预定义 Claude Code 命令
- ✅ 自定义命令管理功能
- ✅ 键盘导航和自动完成
- ✅ 用户级和项目级命令支持
- ✅ 设置界面集成

## 未来规划

- [ ] 命令历史记录
- [ ] 命令别名支持
- [ ] 批量命令操作
- [ ] 命令模板功能
- [ ] 云端同步支持
- [ ] 命令执行统计
- [ ] AI 建议命令
- [ ] 语音命令触发

---

更多信息请参考 [Claude Code 官方文档](https://claude.ai/code) 或项目 [GitHub 仓库](https://github.com/anthropics/claude-code)。