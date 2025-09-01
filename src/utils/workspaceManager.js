/**
 * 工作区管理系统核心逻辑
 * 支持多项目、多会话、多布局的工作区管理
 */

import { v4 as uuidv4 } from 'uuid';

export class WorkspaceManager {
  constructor() {
    this.workspaces = this.loadWorkspaces();
    this.activeWorkspaceId = this.getActiveWorkspaceId();
    this.projectStates = new Map(); // 项目状态缓存
  }

  /**
   * 创建新工作区
   */
  createWorkspace(config) {
    const workspace = {
      id: uuidv4(),
      name: config.name || '新工作区',
      description: config.description || '',
      color: config.color || '#3B82F6',
      icon: config.icon || '💼',
      projects: [],
      settings: {
        defaultCLI: 'claude',
        autoSave: true,
        syncSettings: true,
        notifications: {
          projectChanges: true,
          buildStatus: true,
          gitUpdates: true
        },
        integrations: {
          github: { enabled: false, token: null },
          jira: { enabled: false, url: null, token: null }
        }
      },
      layout: {
        type: 'grid',
        activeProjects: [],
        panelSizes: []
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: false
    };

    this.workspaces.push(workspace);
    this.saveWorkspaces();
    return workspace;
  }

  /**
   * 添加项目到工作区
   */
  addProjectToWorkspace(workspaceId, projectPath, options = {}) {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`工作区不存在: ${workspaceId}`);
    }

    // 检查项目是否已存在
    const existingProject = workspace.projects.find(p => p.projectPath === projectPath);
    if (existingProject) {
      throw new Error('项目已存在于此工作区');
    }

    const project = {
      id: uuidv4(),
      projectPath,
      alias: options.alias || null,
      position: options.position || { x: 0, y: 0 },
      pinned: options.pinned || false,
      lastAccessed: new Date(),
      customSettings: options.customSettings || {},
      sessions: [], // 项目关联的会话
      activeSession: null,
      activeTab: 'chat'
    };

    workspace.projects.push(project);
    workspace.updatedAt = new Date();
    this.saveWorkspaces();

    return project;
  }

  /**
   * 激活工作区
   */
  async switchWorkspace(workspaceId) {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`工作区不存在: ${workspaceId}`);
    }

    // 保存当前工作区状态
    if (this.activeWorkspaceId) {
      await this.saveWorkspaceState(this.activeWorkspaceId);
    }

    // 切换到新工作区
    this.setActiveWorkspace(workspaceId);
    
    // 恢复工作区状态
    await this.restoreWorkspaceState(workspaceId);

    // 触发工作区切换事件
    this.emit('workspaceChanged', { 
      previousId: this.activeWorkspaceId, 
      currentId: workspaceId 
    });

    return workspace;
  }

  /**
   * 批量操作项目
   */
  async batchProjectOperation(workspaceId, projectIds, operation, options = {}) {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`工作区不存在: ${workspaceId}`);
    }

    const projects = workspace.projects.filter(p => projectIds.includes(p.id));
    const results = [];

    for (const project of projects) {
      try {
        let result;
        switch (operation) {
          case 'git-pull':
            result = await this.gitPullProject(project);
            break;
          case 'git-status':
            result = await this.getProjectGitStatus(project);
            break;
          case 'run-command':
            result = await this.runCommandInProject(project, options.command);
            break;
          case 'update-dependencies':
            result = await this.updateProjectDependencies(project);
            break;
          default:
            throw new Error(`未知操作: ${operation}`);
        }
        results.push({ projectId: project.id, success: true, data: result });
      } catch (error) {
        results.push({ 
          projectId: project.id, 
          success: false, 
          error: error.message 
        });
      }
    }

    return results;
  }

  /**
   * 工作区布局管理
   */
  updateWorkspaceLayout(workspaceId, layout) {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`工作区不存在: ${workspaceId}`);
    }

    workspace.layout = { ...workspace.layout, ...layout };
    workspace.updatedAt = new Date();
    this.saveWorkspaces();

    return workspace.layout;
  }

  /**
   * 分屏管理
   */
  splitWorkspace(workspaceId, direction = 'horizontal') {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`工作区不存在: ${workspaceId}`);
    }

    const activeProjects = workspace.layout.activeProjects;
    if (activeProjects.length === 0) {
      throw new Error('没有激活的项目可以分屏');
    }

    // 更新布局
    workspace.layout.type = 'split';
    workspace.layout.splitDirection = direction;
    workspace.layout.panelSizes = new Array(activeProjects.length).fill(
      100 / activeProjects.length
    );

    this.saveWorkspaces();
    return workspace.layout;
  }

  /**
   * 工作区模板系统
   */
  createWorkspaceTemplate(workspaceId, templateName) {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`工作区不存在: ${workspaceId}`);
    }

    const template = {
      id: uuidv4(),
      name: templateName,
      description: `基于 ${workspace.name} 创建的模板`,
      config: {
        settings: { ...workspace.settings },
        layout: { ...workspace.layout },
        projectStructure: workspace.projects.map(p => ({
          path: p.projectPath,
          alias: p.alias,
          position: p.position,
          customSettings: p.customSettings
        }))
      },
      createdAt: new Date()
    };

    this.saveTemplate(template);
    return template;
  }

  /**
   * 从模板创建工作区
   */
  createWorkspaceFromTemplate(templateId, workspaceName) {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`模板不存在: ${templateId}`);
    }

    const workspace = this.createWorkspace({
      name: workspaceName,
      ...template.config
    });

    // 添加模板中的项目结构
    for (const projectConfig of template.config.projectStructure) {
      try {
        this.addProjectToWorkspace(workspace.id, projectConfig.path, {
          alias: projectConfig.alias,
          position: projectConfig.position,
          customSettings: projectConfig.customSettings
        });
      } catch (error) {
        console.warn(`添加项目失败: ${projectConfig.path}`, error);
      }
    }

    return workspace;
  }

  /**
   * 环境变量和配置管理
   */
  setWorkspaceEnvironment(workspaceId, envVars) {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`工作区不存在: ${workspaceId}`);
    }

    if (!workspace.settings.environment) {
      workspace.settings.environment = {};
    }

    workspace.settings.environment = { ...workspace.settings.environment, ...envVars };
    workspace.updatedAt = new Date();
    this.saveWorkspaces();

    return workspace.settings.environment;
  }

  // ========== 私有方法 ==========

  getWorkspace(workspaceId) {
    return this.workspaces.find(w => w.id === workspaceId);
  }

  getActiveWorkspace() {
    return this.getWorkspace(this.activeWorkspaceId);
  }

  setActiveWorkspace(workspaceId) {
    // 取消之前的激活状态
    this.workspaces.forEach(w => w.isActive = false);
    
    // 设置新的激活状态
    const workspace = this.getWorkspace(workspaceId);
    if (workspace) {
      workspace.isActive = true;
      this.activeWorkspaceId = workspaceId;
      localStorage.setItem('activeWorkspaceId', workspaceId);
      this.saveWorkspaces();
    }
  }

  loadWorkspaces() {
    try {
      const stored = localStorage.getItem('workspaces');
      return stored ? JSON.parse(stored) : this.createDefaultWorkspaceArray();
    } catch (error) {
      console.warn('加载工作区失败:', error);
      return this.createDefaultWorkspaceArray();
    }
  }

  saveWorkspaces() {
    try {
      localStorage.setItem('workspaces', JSON.stringify(this.workspaces));
    } catch (error) {
      console.error('保存工作区失败:', error);
    }
  }

  createDefaultWorkspaceArray() {
    // 直接创建默认工作区对象，避免循环依赖
    const defaultWorkspace = {
      id: uuidv4(),
      name: '默认工作区',
      description: '默认的开发工作区',
      color: '#3B82F6',
      icon: '🏠',
      projects: [],
      settings: {
        defaultCLI: 'claude',
        autoSave: true,
        syncSettings: true,
        notifications: {
          projectChanges: true,
          buildStatus: true,
          gitUpdates: true
        },
        integrations: {
          github: { enabled: false, token: null },
          jira: { enabled: false, url: null, token: null }
        }
      },
      layout: {
        type: 'grid',
        activeProjects: [],
        panelSizes: []
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };
    
    // 设置为活动工作区
    this.activeWorkspaceId = defaultWorkspace.id;
    localStorage.setItem('activeWorkspaceId', defaultWorkspace.id);
    
    return [defaultWorkspace];
  }

  createDefaultWorkspace() {
    const defaultWorkspace = this.createWorkspace({
      name: '默认工作区',
      description: '默认的开发工作区',
      color: '#3B82F6',
      icon: '🏠'
    });
    
    defaultWorkspace.isActive = true;
    this.activeWorkspaceId = defaultWorkspace.id;
    
    return [defaultWorkspace];
  }

  getActiveWorkspaceId() {
    return localStorage.getItem('activeWorkspaceId') || 
           (this.workspaces.length > 0 ? this.workspaces[0].id : null);
  }

  async saveWorkspaceState(workspaceId) {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) return;

    // 保存当前项目状态、会话、布局等
    const state = {
      activeProjects: workspace.layout.activeProjects,
      panelSizes: workspace.layout.panelSizes,
      projectStates: {}
    };

    // 保存每个项目的状态
    for (const project of workspace.projects) {
      state.projectStates[project.id] = {
        lastAccessed: project.lastAccessed,
        activeSession: project.activeSession,
        activeTab: project.activeTab
      };
    }

    localStorage.setItem(`workspaceState_${workspaceId}`, JSON.stringify(state));
  }

  async restoreWorkspaceState(workspaceId) {
    try {
      const stateJson = localStorage.getItem(`workspaceState_${workspaceId}`);
      if (!stateJson) return;

      const state = JSON.parse(stateJson);
      const workspace = this.getWorkspace(workspaceId);
      if (!workspace) return;

      // 恢复布局
      workspace.layout.activeProjects = state.activeProjects || [];
      workspace.layout.panelSizes = state.panelSizes || [];

      // 恢复项目状态
      for (const project of workspace.projects) {
        const projectState = state.projectStates?.[project.id];
        if (projectState) {
          project.lastAccessed = new Date(projectState.lastAccessed);
          project.activeSession = projectState.activeSession;
          project.activeTab = projectState.activeTab;
        }
      }

      this.saveWorkspaces();
    } catch (error) {
      console.warn('恢复工作区状态失败:', error);
    }
  }

  // 事件系统
  emit(event, data) {
    if (this.eventListeners?.[event]) {
      this.eventListeners[event].forEach(callback => callback(data));
    }
  }

  on(event, callback) {
    if (!this.eventListeners) {
      this.eventListeners = {};
    }
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  off(event, callback) {
    if (this.eventListeners?.[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }
  }
}

// 单例导出
export const workspaceManager = new WorkspaceManager();