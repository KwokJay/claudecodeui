/**
 * Claude Code 命令系统
 * 基于SuperClaude框架的命令定义和管理
 */

// Claude Code CLI 原生命令
export const CLAUDE_NATIVE_COMMANDS = [
  {
    id: 'mcp',
    name: '/mcp',
    category: 'Native CLI',
    description: 'Claude Code MCP服务器管理',
    purpose: 'MCP server management',
    icon: '🔌',
    examples: ['/mcp list', '/mcp status'],
    flags: ['list', 'status', 'restart'],
    isNativeCommand: true
  },
  {
    id: 'session',
    name: '/session',
    category: 'Native CLI',
    description: 'Claude Code会话管理',
    purpose: 'Session management',
    icon: '💬',
    examples: ['/session list', '/session resume <id>'],
    flags: ['list', 'resume', 'delete'],
    isNativeCommand: true
  },
  {
    id: 'help',
    name: '/help',
    category: 'Native CLI',
    description: 'Claude Code帮助信息',
    purpose: 'CLI help information',
    icon: '❓',
    examples: ['/help', '/help commands'],
    flags: ['commands', 'flags'],
    isNativeCommand: true
  },
  {
    id: 'login',
    name: '/login',
    category: 'Native CLI',
    description: 'Claude Code用户登录',
    purpose: 'User authentication',
    icon: '🔐',
    examples: ['/login'],
    flags: [],
    isNativeCommand: true
  },
  {
    id: 'logout',
    name: '/logout',
    category: 'Native CLI',
    description: 'Claude Code用户登出',
    purpose: 'User logout',
    icon: '🚪',
    examples: ['/logout'],
    flags: [],
    isNativeCommand: true
  }
];

// 核心Claude Code命令定义
export const CLAUDE_COMMANDS = [
  // 开发命令
  {
    id: 'build',
    name: '/build',
    category: 'Development',
    description: '构建项目并检测框架',
    purpose: 'Project builder with framework detection',
    icon: '🔨',
    examples: ['/build', '/build --target web', '/build @src/components'],
    flags: ['--target', '--framework', '--optimize'],
    waveEnabled: true,
    autoActivates: ['Frontend', 'Backend', 'Architect', 'Scribe']
  },
  {
    id: 'implement',
    name: '/implement',
    category: 'Development',
    description: '实现功能和代码',
    purpose: 'Feature and code implementation',
    icon: '⚡',
    examples: ['/implement user login', '/implement @components/Button'],
    flags: ['--type', '--framework'],
    waveEnabled: true,
    autoActivates: ['Frontend', 'Backend', 'Architect']
  },

  // 分析命令
  {
    id: 'analyze',
    name: '/analyze',
    category: 'Analysis',
    description: '多维度代码和系统分析',
    purpose: 'Multi-dimensional code and system analysis',
    icon: '🔍',
    examples: ['/analyze architecture', '/analyze @src/utils', '/analyze --focus performance'],
    flags: ['--focus', '--scope', '--depth'],
    waveEnabled: true,
    autoActivates: ['Analyzer', 'Architect', 'Security']
  },
  {
    id: 'troubleshoot',
    name: '/troubleshoot',
    category: 'Analysis',
    description: '问题调查和故障排除 (使用 /troubleshoot 触发)',
    purpose: 'Problem investigation and troubleshooting',
    icon: '🚨',
    examples: ['/troubleshoot login error', '/troubleshoot --focus network'],
    flags: ['--focus', '--trace', '--debug'],
    autoActivates: ['Analyzer', 'QA']
  },
  {
    id: 'explain',
    name: '/explain',
    category: 'Analysis',
    description: '教育性解释和说明 (使用 /explain 触发)',
    purpose: 'Educational explanations',
    icon: '💡',
    examples: ['/explain React hooks', '/explain @src/auth.js'],
    flags: ['--detailed', '--simple'],
    autoActivates: ['Mentor', 'Scribe']
  },

  // 质量命令
  {
    id: 'improve',
    name: '/improve',
    category: 'Quality',
    description: '基于证据的代码增强 (使用 /improve 触发)',
    purpose: 'Evidence-based code enhancement',
    icon: '📈',
    examples: ['/improve performance', '/improve @src/api --focus security'],
    flags: ['--focus', '--iterative', '--validate'],
    waveEnabled: true,
    autoActivates: ['Refactorer', 'Performance', 'Security']
  },
  {
    id: 'cleanup',
    name: '/cleanup',
    category: 'Quality',
    description: '项目清理和技术债务减少 (使用 /cleanup 触发)',
    purpose: 'Project cleanup and technical debt reduction',
    icon: '🧹',
    examples: ['/cleanup unused', '/cleanup @src/legacy'],
    flags: ['--scope', '--aggressive'],
    autoActivates: ['Refactorer']
  },

  // 测试命令
  {
    id: 'test',
    name: '/test',
    category: 'Testing',
    description: '测试工作流 (使用 /test 触发)',
    purpose: 'Testing workflows',
    icon: '🧪',
    examples: ['/test unit', '/test e2e --browser chrome'],
    flags: ['--type', '--browser', '--coverage'],
    autoActivates: ['QA']
  },

  // 文档命令
  {
    id: 'document',
    name: '/document',
    category: 'Documentation',
    description: '文档生成 (使用 /document 触发)',
    purpose: 'Documentation generation',
    icon: '📚',
    examples: ['/document API', '/document @src/components'],
    flags: ['--type', '--language'],
    autoActivates: ['Scribe', 'Mentor']
  },

  // 计划命令
  {
    id: 'estimate',
    name: '/estimate',
    category: 'Planning',
    description: '基于证据的估算 (使用 /estimate 触发)',
    purpose: 'Evidence-based estimation',
    icon: '⏱️',
    examples: ['/estimate new feature', '/estimate @src/refactor'],
    flags: ['--complexity', '--resources'],
    autoActivates: ['Analyzer', 'Architect']
  },
  {
    id: 'task',
    name: '/task',
    category: 'Planning',
    description: '长期项目管理 (使用 /task 触发)',
    purpose: 'Long-term project management',
    icon: '📋',
    examples: ['/task create "User authentication"', '/task list'],
    flags: ['--priority', '--assign'],
    waveEnabled: true,
    autoActivates: ['Architect', 'Analyzer']
  },

  // 版本控制命令
  {
    id: 'git',
    name: '/git',
    category: 'Version Control',
    description: 'Git工作流助手 (使用 /git 触发)',
    purpose: 'Git workflow assistant',
    icon: '🌿',
    examples: ['/git commit', '/git merge --branch feature'],
    flags: ['--branch', '--message', '--force'],
    autoActivates: ['DevOps', 'Scribe']
  },

  // 设计命令
  {
    id: 'design',
    name: '/design',
    category: 'Design',
    description: '设计编排 (使用 /design 触发)',
    purpose: 'Design orchestration',
    icon: '🎨',
    examples: ['/design UI mockup', '/design architecture --system'],
    flags: ['--system', '--component', '--responsive'],
    waveEnabled: true,
    autoActivates: ['Architect', 'Frontend']
  },

  // 元命令
  {
    id: 'index',
    name: '/index',
    category: 'Meta',
    description: '命令目录浏览 (使用 /index 触发)',
    purpose: 'Command catalog browsing',
    icon: '🗂️',
    examples: ['/index search', '/index --category Development'],
    flags: ['--category', '--search'],
    autoActivates: ['Mentor', 'Analyzer']
  },
  {
    id: 'load',
    name: '/load',
    category: 'Meta',
    description: '项目上下文加载 (使用 /load 触发)',
    purpose: 'Project context loading',
    icon: '📂',
    examples: ['/load @project', '/load --recursive'],
    flags: ['--recursive', '--filter'],
    autoActivates: ['Analyzer', 'Architect']
  }
];

// 命令类别映射
export const COMMAND_CATEGORIES = {
  'Development': { color: 'blue', icon: '⚡', description: '开发和构建' },
  'Analysis': { color: 'green', icon: '🔍', description: '分析和调查' },
  'Quality': { color: 'yellow', icon: '📈', description: '质量和改进' },
  'Testing': { color: 'purple', icon: '🧪', description: '测试和验证' },
  'Documentation': { color: 'indigo', icon: '📚', description: '文档和说明' },
  'Planning': { color: 'pink', icon: '📋', description: '规划和估算' },
  'Version Control': { color: 'gray', icon: '🌿', description: '版本控制' },
  'Design': { color: 'red', icon: '🎨', description: '设计和架构' },
  'Meta': { color: 'cyan', icon: '🗂️', description: '元命令和工具' }
};

// 常用标志定义
export const COMMON_FLAGS = {
  '--focus': {
    description: '专注领域',
    values: ['performance', 'security', 'quality', 'architecture', 'accessibility']
  },
  '--scope': {
    description: '范围级别',
    values: ['file', 'module', 'project', 'system']
  },
  '--type': {
    description: '类型指定',
    values: ['component', 'api', 'service', 'feature', 'unit', 'integration', 'e2e']
  },
  '--framework': {
    description: '框架选择',
    values: ['react', 'vue', 'angular', 'svelte', 'node', 'express']
  }
};

/**
 * 命令管理类
 */
export class CommandManager {
  constructor() {
    this.commands = [...CLAUDE_NATIVE_COMMANDS, ...CLAUDE_COMMANDS];
    this.userCommands = this.loadUserCommands();
    this.projectCommands = this.loadProjectCommands();
    this.fileCommands = { user: [], project: [] }; // .claude/commands 文件中的命令
  }

  /**
   * 从API加载文件命令
   */
  async loadFileCommands(projectName = null) {
    try {
      const url = projectName ? `/api/commands?projectName=${encodeURIComponent(projectName)}` : '/api/commands';
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const commands = await response.json();
        this.fileCommands.user = commands.user || [];
        this.fileCommands.project = commands.project || [];
        console.log('Loaded file commands:', this.fileCommands);
      }
    } catch (error) {
      console.warn('Failed to load file commands:', error);
    }
  }

  /**
   * 获取所有命令
   */
  getAllCommands() {
    return [
      ...this.commands,
      ...this.userCommands,
      ...this.projectCommands,
      ...this.fileCommands.user,
      ...this.fileCommands.project
    ];
  }

  /**
   * 按类别过滤命令
   */
  getCommandsByCategory(category) {
    return this.getAllCommands().filter(cmd => cmd.category === category);
  }

  /**
   * 搜索命令
   */
  searchCommands(query, limit = 50) {
    if (!query || query.startsWith('/')) {
      return this.getAllCommands().slice(0, limit);
    }

    const searchTerm = query.toLowerCase();
    const allCommands = this.getAllCommands();
    
    const results = allCommands
      .map(cmd => ({
        ...cmd,
        score: this.calculateScore(cmd, searchTerm)
      }))
      .filter(cmd => cmd.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return results;
  }

  /**
   * 计算命令匹配分数
   */
  calculateScore(command, searchTerm) {
    let score = 0;
    
    // 命令名精确匹配
    if (command.name.toLowerCase().includes(searchTerm)) {
      score += 100;
    }
    
    // 描述匹配
    if (command.description.toLowerCase().includes(searchTerm)) {
      score += 50;
    }
    
    // 类别匹配
    if (command.category.toLowerCase().includes(searchTerm)) {
      score += 30;
    }
    
    // 示例匹配
    if (command.examples && command.examples.some(ex => 
      ex.toLowerCase().includes(searchTerm))) {
      score += 20;
    }

    return score;
  }

  /**
   * 加载用户级自定义命令
   */
  loadUserCommands() {
    try {
      const stored = localStorage.getItem('claude-user-commands');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to load user commands:', error);
      return [];
    }
  }

  /**
   * 加载项目级自定义命令
   */
  loadProjectCommands() {
    try {
      const projectName = localStorage.getItem('current-project');
      if (!projectName) return [];
      
      const stored = localStorage.getItem(`claude-project-commands-${projectName}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to load project commands:', error);
      return [];
    }
  }

  /**
   * 添加用户命令
   */
  addUserCommand(command) {
    const newCommand = {
      ...command,
      id: `user_${Date.now()}`,
      isUserCommand: true
    };
    
    this.userCommands.push(newCommand);
    this.saveUserCommands();
    return newCommand;
  }

  /**
   * 添加项目命令
   */
  addProjectCommand(command) {
    const newCommand = {
      ...command,
      id: `project_${Date.now()}`,
      isProjectCommand: true
    };
    
    this.projectCommands.push(newCommand);
    this.saveProjectCommands();
    return newCommand;
  }

  /**
   * 保存用户命令
   */
  saveUserCommands() {
    try {
      localStorage.setItem('claude-user-commands', JSON.stringify(this.userCommands));
    } catch (error) {
      console.warn('Failed to save user commands:', error);
    }
  }

  /**
   * 保存项目命令
   */
  saveProjectCommands() {
    try {
      const projectName = localStorage.getItem('current-project');
      if (projectName) {
        localStorage.setItem(
          `claude-project-commands-${projectName}`, 
          JSON.stringify(this.projectCommands)
        );
      }
    } catch (error) {
      console.warn('Failed to save project commands:', error);
    }
  }

  /**
   * 删除命令
   */
  removeCommand(commandId) {
    this.userCommands = this.userCommands.filter(cmd => cmd.id !== commandId);
    this.projectCommands = this.projectCommands.filter(cmd => cmd.id !== commandId);
    this.saveUserCommands();
    this.saveProjectCommands();
  }
}

// 单例实例
export const commandManager = new CommandManager();