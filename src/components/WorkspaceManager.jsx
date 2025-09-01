/**
 * 工作区管理器主组件
 * 提供工作区的创建、编辑、切换和管理功能
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, Settings, X, Grid3x3, Maximize2, Copy, Trash2, 
  Pin, PinOff, FolderOpen, GitBranch, Play, Square,
  Layout, LayoutGrid, LayoutList, Columns, Rows
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { workspaceManager } from '../utils/workspaceManager';

const WorkspaceManager = ({ isOpen, onClose, onWorkspaceChange }) => {
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [layoutMode, setLayoutMode] = useState('grid');

  useEffect(() => {
    if (isOpen) {
      loadWorkspaces();
    }
  }, [isOpen]);

  const loadWorkspaces = () => {
    const allWorkspaces = workspaceManager.workspaces;
    setWorkspaces(allWorkspaces);
    
    const activeWorkspace = allWorkspaces.find(w => w.isActive);
    if (activeWorkspace && !selectedWorkspace) {
      setSelectedWorkspace(activeWorkspace);
    }
  };

  const handleCreateWorkspace = async (config) => {
    try {
      const newWorkspace = workspaceManager.createWorkspace(config);
      setWorkspaces([...workspaces, newWorkspace]);
      setSelectedWorkspace(newWorkspace);
      setShowCreateForm(false);
    } catch (error) {
      console.error('创建工作区失败:', error);
    }
  };

  const handleSwitchWorkspace = async (workspaceId) => {
    try {
      const workspace = await workspaceManager.switchWorkspace(workspaceId);
      setWorkspaces(workspaces.map(w => ({ 
        ...w, 
        isActive: w.id === workspaceId 
      })));
      setSelectedWorkspace(workspace);
      onWorkspaceChange?.(workspace);
    } catch (error) {
      console.error('切换工作区失败:', error);
    }
  };

  const handleDeleteWorkspace = async (workspaceId) => {
    if (confirm('确定要删除此工作区吗？这将删除所有相关配置。')) {
      try {
        workspaceManager.deleteWorkspace(workspaceId);
        const updatedWorkspaces = workspaces.filter(w => w.id !== workspaceId);
        setWorkspaces(updatedWorkspaces);
        
        if (selectedWorkspace?.id === workspaceId) {
          setSelectedWorkspace(updatedWorkspaces[0] || null);
        }
      } catch (error) {
        console.error('删除工作区失败:', error);
      }
    }
  };

  const handleUpdateWorkspaceLayout = (layoutType) => {
    if (!selectedWorkspace) return;
    
    try {
      workspaceManager.updateWorkspaceLayout(selectedWorkspace.id, {
        type: layoutType
      });
      
      setSelectedWorkspace({
        ...selectedWorkspace,
        layout: { ...selectedWorkspace.layout, type: layoutType }
      });
    } catch (error) {
      console.error('更新布局失败:', error);
    }
  };

  const filteredWorkspaces = workspaces.filter(w => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex">
        
        {/* 侧边栏 - 工作区列表 */}
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {/* 标题和搜索 */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                工作区管理
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              <Input
                placeholder="搜索工作区..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
              
              <Button
                onClick={() => setShowCreateForm(true)}
                className="w-full"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                新建工作区
              </Button>
            </div>
          </div>

          {/* 工作区列表 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredWorkspaces.map(workspace => (
              <WorkspaceCard
                key={workspace.id}
                workspace={workspace}
                isSelected={selectedWorkspace?.id === workspace.id}
                isActive={workspace.isActive}
                onClick={() => setSelectedWorkspace(workspace)}
                onSwitch={() => handleSwitchWorkspace(workspace.id)}
                onDelete={() => handleDeleteWorkspace(workspace.id)}
              />
            ))}
          </div>
        </div>

        {/* 主内容区 */}
        <div className="flex-1 flex flex-col">
          {selectedWorkspace ? (
            <>
              {/* 工作区标题 */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg"
                      style={{ backgroundColor: selectedWorkspace.color }}
                    >
                      {selectedWorkspace.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {selectedWorkspace.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedWorkspace.projects.length} 个项目
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {selectedWorkspace.isActive && (
                      <Badge variant="success">当前激活</Badge>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleSwitchWorkspace(selectedWorkspace.id)}
                    >
                      {selectedWorkspace.isActive ? '已激活' : '激活'}
                    </Button>
                  </div>
                </div>

                {/* 标签页 */}
                <div className="flex gap-1 mt-4">
                  {['overview', 'projects', 'layout', 'settings'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeTab === tab
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {tab === 'overview' && '概览'}
                      {tab === 'projects' && '项目'}
                      {tab === 'layout' && '布局'}
                      {tab === 'settings' && '设置'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 标签页内容 */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'overview' && (
                  <WorkspaceOverview workspace={selectedWorkspace} />
                )}
                {activeTab === 'projects' && (
                  <WorkspaceProjects 
                    workspace={selectedWorkspace}
                    onUpdate={loadWorkspaces}
                  />
                )}
                {activeTab === 'layout' && (
                  <WorkspaceLayout 
                    workspace={selectedWorkspace}
                    onLayoutChange={handleUpdateWorkspaceLayout}
                  />
                )}
                {activeTab === 'settings' && (
                  <WorkspaceSettings 
                    workspace={selectedWorkspace}
                    onUpdate={loadWorkspaces}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <Layout className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>选择工作区开始管理</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 创建工作区弹窗 */}
      {showCreateForm && (
        <CreateWorkspaceForm
          onSubmit={handleCreateWorkspace}
          onCancel={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
};

// 工作区卡片组件
const WorkspaceCard = ({ workspace, isSelected, isActive, onClick, onSwitch, onDelete }) => (
  <div 
    className={`p-3 rounded-lg border cursor-pointer transition-all ${
      isSelected 
        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
    }`}
    onClick={onClick}
  >
    <div className="flex items-center gap-3 mb-2">
      <div 
        className="w-8 h-8 rounded-md flex items-center justify-center text-white text-sm"
        style={{ backgroundColor: workspace.color }}
      >
        {workspace.icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 dark:text-white truncate">
          {workspace.name}
        </h4>
        <p className="text-xs text-gray-500 truncate">
          {workspace.projects.length} 项目
        </p>
      </div>
    </div>
    
    {workspace.description && (
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
        {workspace.description}
      </p>
    )}
    
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1">
        {isActive && (
          <Badge variant="success" size="sm">活跃</Badge>
        )}
      </div>
      
      <div className="flex gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSwitch();
          }}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          title={isActive ? '当前激活' : '激活工作区'}
        >
          <Play className="w-3 h-3" />
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
          title="删除工作区"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  </div>
);

// 工作区概览组件
const WorkspaceOverview = ({ workspace }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
          {workspace.projects.length}
        </div>
        <div className="text-sm text-blue-600 dark:text-blue-400">
          关联项目
        </div>
      </div>
      
      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
        <div className="text-2xl font-bold text-green-700 dark:text-green-300">
          {workspace.projects.filter(p => p.pinned).length}
        </div>
        <div className="text-sm text-green-600 dark:text-green-400">
          固定项目
        </div>
      </div>
      
      <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
        <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
          {workspace.layout.type}
        </div>
        <div className="text-sm text-purple-600 dark:text-purple-400">
          布局模式
        </div>
      </div>
    </div>

    <div>
      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
        最近访问的项目
      </h4>
      <div className="space-y-2">
        {workspace.projects
          .sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed))
          .slice(0, 5)
          .map(project => (
            <div key={project.id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
              <FolderOpen className="w-4 h-4 text-gray-500" />
              <div className="flex-1">
                <div className="text-sm font-medium">
                  {project.alias || project.projectPath.split('/').pop()}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(project.lastAccessed).toLocaleDateString()}
                </div>
              </div>
              {project.pinned && (
                <Pin className="w-4 h-4 text-blue-500" />
              )}
            </div>
          ))}
      </div>
    </div>
  </div>
);

// 项目管理组件
const WorkspaceProjects = ({ workspace, onUpdate }) => {
  const [showAddProject, setShowAddProject] = useState(false);
  
  const handleAddProject = (projectPath, options = {}) => {
    try {
      workspaceManager.addProjectToWorkspace(workspace.id, projectPath, options);
      onUpdate();
      setShowAddProject(false);
    } catch (error) {
      console.error('添加项目失败:', error);
      alert(error.message);
    }
  };

  const handleRemoveProject = (projectId) => {
    if (confirm('确定要从此工作区移除该项目吗？')) {
      try {
        workspaceManager.removeProjectFromWorkspace(workspace.id, projectId);
        onUpdate();
      } catch (error) {
        console.error('移除项目失败:', error);
      }
    }
  };

  const togglePin = (projectId) => {
    try {
      workspaceManager.toggleProjectPin(workspace.id, projectId);
      onUpdate();
    } catch (error) {
      console.error('切换固定状态失败:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900 dark:text-white">
          项目列表 ({workspace.projects.length})
        </h4>
        <Button
          onClick={() => setShowAddProject(true)}
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          添加项目
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workspace.projects.map(project => (
          <div key={project.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-medium text-gray-900 dark:text-white">
                {project.alias || project.projectPath.split('/').pop()}
              </h5>
              <div className="flex gap-1">
                <button
                  onClick={() => togglePin(project.id)}
                  className={`p-1 rounded ${
                    project.pinned 
                      ? 'text-blue-500 hover:text-blue-600' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title={project.pinned ? '取消固定' : '固定项目'}
                >
                  {project.pinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleRemoveProject(project.id)}
                  className="p-1 rounded text-red-500 hover:text-red-600"
                  title="移除项目"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {project.projectPath}
            </p>
            
            <div className="text-xs text-gray-500">
              最后访问: {new Date(project.lastAccessed).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {showAddProject && (
        <AddProjectForm
          onSubmit={handleAddProject}
          onCancel={() => setShowAddProject(false)}
        />
      )}
    </div>
  );
};

// 布局设置组件
const WorkspaceLayout = ({ workspace, onLayoutChange }) => {
  const layoutOptions = [
    { key: 'grid', name: '网格布局', icon: LayoutGrid, description: '项目以卡片网格形式显示' },
    { key: 'tabs', name: '标签页', icon: LayoutList, description: '项目以标签页形式显示' },
    { key: 'split', name: '分屏', icon: Columns, description: '项目并排显示' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
          布局模式
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {layoutOptions.map(option => (
            <div
              key={option.key}
              onClick={() => onLayoutChange(option.key)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                workspace.layout.type === option.key
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <option.icon className="w-8 h-8 text-gray-600 dark:text-gray-400 mb-2" />
              <h5 className="font-medium text-gray-900 dark:text-white mb-1">
                {option.name}
              </h5>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {option.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {workspace.layout.type === 'split' && (
        <div>
          <h5 className="font-medium text-gray-900 dark:text-white mb-3">
            分屏设置
          </h5>
          <div className="flex gap-4">
            <button
              onClick={() => onLayoutChange({ 
                type: 'split', 
                splitDirection: 'horizontal' 
              })}
              className={`p-3 border rounded-lg ${
                workspace.layout.splitDirection === 'horizontal'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Columns className="w-6 h-6" />
              <div className="text-sm mt-1">水平分割</div>
            </button>
            
            <button
              onClick={() => onLayoutChange({ 
                type: 'split', 
                splitDirection: 'vertical' 
              })}
              className={`p-3 border rounded-lg ${
                workspace.layout.splitDirection === 'vertical'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Rows className="w-6 h-6" />
              <div className="text-sm mt-1">垂直分割</div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// 工作区设置组件
const WorkspaceSettings = ({ workspace, onUpdate }) => {
  const [settings, setSettings] = useState(workspace.settings || {});

  const handleSave = () => {
    try {
      workspaceManager.updateWorkspaceSettings(workspace.id, settings);
      onUpdate();
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
          基础设置
        </h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              默认 CLI
            </label>
            <select
              value={settings.defaultCLI || 'claude'}
              onChange={(e) => setSettings({...settings, defaultCLI: e.target.value})}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="claude">Claude Code</option>
              <option value="cursor">Cursor CLI</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoSave"
              checked={settings.autoSave || false}
              onChange={(e) => setSettings({...settings, autoSave: e.target.checked})}
              className="mr-2"
            />
            <label htmlFor="autoSave" className="text-sm text-gray-700 dark:text-gray-300">
              自动保存工作区状态
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="syncSettings"
              checked={settings.syncSettings || false}
              onChange={(e) => setSettings({...settings, syncSettings: e.target.checked})}
              className="mr-2"
            />
            <label htmlFor="syncSettings" className="text-sm text-gray-700 dark:text-gray-300">
              同步项目设置
            </label>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
          通知设置
        </h4>
        <div className="space-y-2">
          {[
            { key: 'projectChanges', label: '项目变更通知' },
            { key: 'buildStatus', label: '构建状态通知' },
            { key: 'gitUpdates', label: 'Git 更新通知' }
          ].map(item => (
            <div key={item.key} className="flex items-center">
              <input
                type="checkbox"
                id={item.key}
                checked={settings.notifications?.[item.key] || false}
                onChange={(e) => setSettings({
                  ...settings,
                  notifications: {
                    ...settings.notifications,
                    [item.key]: e.target.checked
                  }
                })}
                className="mr-2"
              />
              <label htmlFor={item.key} className="text-sm text-gray-700 dark:text-gray-300">
                {item.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave}>保存设置</Button>
        <Button variant="outline" onClick={onUpdate}>取消</Button>
      </div>
    </div>
  );
};

// 创建工作区表单
const CreateWorkspaceForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: '💼'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('请输入工作区名称');
      return;
    }
    onSubmit(formData);
  };

  const colorOptions = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          创建新工作区
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              工作区名称 *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="输入工作区名称"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="描述此工作区的用途"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                颜色
              </label>
              <div className="flex gap-1 flex-wrap">
                {colorOptions.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({...formData, color})}
                    className={`w-6 h-6 rounded-full border-2 ${
                      formData.color === color ? 'border-white' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                图标
              </label>
              <div className="flex gap-1 flex-wrap text-lg">
                {['💼', '🚀', '🔧', '📱', '🌐', '⚡', '🎨', '📊'].map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData({...formData, icon})}
                    className={`w-8 h-8 rounded border ${
                      formData.icon === icon 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">
              创建工作区
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              取消
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 添加项目表单
const AddProjectForm = ({ onSubmit, onCancel }) => {
  const [projectPath, setProjectPath] = useState('');
  const [alias, setAlias] = useState('');
  const [pinned, setPinned] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!projectPath.trim()) {
      alert('请输入项目路径');
      return;
    }
    onSubmit(projectPath, { alias: alias.trim() || null, pinned });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          添加项目到工作区
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              项目路径 *
            </label>
            <Input
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              placeholder="/path/to/project"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              别名 (可选)
            </label>
            <Input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="项目显示名称"
              className="w-full"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="pinProject"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="pinProject" className="text-sm text-gray-700 dark:text-gray-300">
              固定此项目
            </label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">
              添加项目
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              取消
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkspaceManager;