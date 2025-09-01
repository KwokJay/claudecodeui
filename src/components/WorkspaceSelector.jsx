/**
 * 工作区选择器组件
 * 集成到 Sidebar 顶部，提供快速的工作区切换功能
 */

import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, Plus, Settings, Play, Layout, 
  Folder, Clock, Pin
} from 'lucide-react';
import { workspaceManager } from '../utils/workspaceManager';
import WorkspaceManager from './WorkspaceManager';

const WorkspaceSelector = ({ onWorkspaceChange, className }) => {
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showManager, setShowManager] = useState(false);

  useEffect(() => {
    loadWorkspaces();
    
    // 监听工作区变更事件
    const handleWorkspaceChange = (data) => {
      loadWorkspaces();
      onWorkspaceChange?.(data);
    };

    workspaceManager.on('workspaceChanged', handleWorkspaceChange);
    return () => workspaceManager.off('workspaceChanged', handleWorkspaceChange);
  }, [onWorkspaceChange]);

  const loadWorkspaces = () => {
    const allWorkspaces = workspaceManager.workspaces;
    setWorkspaces(allWorkspaces);
    
    const active = allWorkspaces.find(w => w.isActive);
    setActiveWorkspace(active);
  };

  const handleSwitchWorkspace = async (workspaceId) => {
    try {
      const workspace = await workspaceManager.switchWorkspace(workspaceId);
      setActiveWorkspace(workspace);
      setShowDropdown(false);
      onWorkspaceChange?.(workspace);
    } catch (error) {
      console.error('切换工作区失败:', error);
    }
  };

  const handleCreateQuickWorkspace = () => {
    const name = prompt('输入新工作区名称:');
    if (name && name.trim()) {
      try {
        const workspace = workspaceManager.createWorkspace({
          name: name.trim(),
          color: '#3B82F6',
          icon: '💼'
        });
        setWorkspaces([...workspaces, workspace]);
      } catch (error) {
        console.error('创建工作区失败:', error);
      }
    }
  };

  return (
    <div className={className}>
      {/* 当前工作区显示 */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {activeWorkspace ? (
              <>
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm flex-shrink-0"
                  style={{ backgroundColor: activeWorkspace.color }}
                >
                  {activeWorkspace.icon}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-medium text-gray-900 dark:text-white truncate">
                    {activeWorkspace.name}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {activeWorkspace.projects.length} 个项目
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-lg bg-gray-300 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                  <Layout className="w-4 h-4" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-900 dark:text-white">
                    选择工作区
                  </div>
                  <div className="text-xs text-gray-500">
                    未选择任何工作区
                  </div>
                </div>
              </>
            )}
          </div>
          <ChevronDown 
            className={`w-4 h-4 text-gray-500 transition-transform ${
              showDropdown ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* 工作区下拉菜单 */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
            {/* 快速操作 */}
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <div className="flex gap-1">
                <button
                  onClick={handleCreateQuickWorkspace}
                  className="flex-1 flex items-center justify-center gap-2 p-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  title="快速创建工作区"
                >
                  <Plus className="w-4 h-4" />
                  新建
                </button>
                <button
                  onClick={() => {
                    setShowManager(true);
                    setShowDropdown(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 p-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  title="工作区管理"
                >
                  <Settings className="w-4 h-4" />
                  管理
                </button>
              </div>
            </div>

            {/* 工作区列表 */}
            <div className="max-h-60 overflow-y-auto">
              {workspaces.length > 0 ? (
                workspaces.map(workspace => (
                  <div
                    key={workspace.id}
                    className={`flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                      activeWorkspace?.id === workspace.id 
                        ? 'bg-blue-50 dark:bg-blue-900/20' 
                        : ''
                    }`}
                    onClick={() => handleSwitchWorkspace(workspace.id)}
                  >
                    <div 
                      className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs flex-shrink-0"
                      style={{ backgroundColor: workspace.color }}
                    >
                      {workspace.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white truncate">
                          {workspace.name}
                        </span>
                        {workspace.isActive && (
                          <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Folder className="w-3 h-3" />
                          {workspace.projects.length}
                        </span>
                        <span className="flex items-center gap-1">
                          <Pin className="w-3 h-3" />
                          {workspace.projects.filter(p => p.pinned).length}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(workspace.updatedAt)}
                        </span>
                      </div>
                    </div>

                    {!workspace.isActive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSwitchWorkspace(workspace.id);
                        }}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 opacity-0 group-hover:opacity-100"
                        title="激活工作区"
                      >
                        <Play className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">
                  <Layout className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">还没有工作区</p>
                  <button
                    onClick={handleCreateQuickWorkspace}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1"
                  >
                    创建第一个工作区
                  </button>
                </div>
              )}
            </div>

            {/* 工作区统计 */}
            {workspaces.length > 0 && (
              <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>总共 {workspaces.length} 个工作区</span>
                  <span>
                    {workspaces.reduce((sum, w) => sum + w.projects.length, 0)} 个项目
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 工作区管理器弹窗 */}
      {showManager && (
        <WorkspaceManager
          isOpen={showManager}
          onClose={() => setShowManager(false)}
          onWorkspaceChange={(workspace) => {
            setActiveWorkspace(workspace);
            loadWorkspaces();
          }}
        />
      )}
    </div>
  );
};

// 时间格式化函数
const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now - date;
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return '今天';
  if (diffInDays === 1) return '昨天';
  if (diffInDays < 7) return `${diffInDays}天前`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}周前`;
  return date.toLocaleDateString();
};

export default WorkspaceSelector;