/**
 * CommandManager.jsx - 自定义指令管理组件
 * 用于管理用户级和项目级自定义Claude Code命令
 */

import React, { useState, useEffect } from 'react';
import { commandManager, COMMAND_CATEGORIES, COMMON_FLAGS } from '../utils/claudeCommands';

const CommandManager = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('user'); // 'user' or 'project'
  const [commands, setCommands] = useState({ user: [], project: [] });
  const [showForm, setShowForm] = useState(false);
  const [editingCommand, setEditingCommand] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Development',
    description: '',
    icon: '⚡',
    examples: [''],
    flags: [],
    waveEnabled: false,
    autoActivates: []
  });

  // 加载命令
  useEffect(() => {
    setCommands({
      user: commandManager.userCommands,
      project: commandManager.projectCommands
    });
  }, []);

  // 表单处理
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayChange = (field, index, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayItem = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayItem = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // 验证表单
    if (!formData.name || !formData.description) {
      alert('请填写命令名称和描述');
      return;
    }

    // 确保命令名称以/开头
    const commandName = formData.name.startsWith('/') ? formData.name : `/${formData.name}`;
    
    const command = {
      ...formData,
      name: commandName,
      examples: formData.examples.filter(ex => ex.trim()),
      flags: formData.flags.filter(flag => flag.trim())
    };

    if (editingCommand) {
      // 编辑现有命令
      if (activeTab === 'user') {
        const index = commandManager.userCommands.findIndex(cmd => cmd.id === editingCommand.id);
        if (index !== -1) {
          commandManager.userCommands[index] = { ...command, id: editingCommand.id };
          commandManager.saveUserCommands();
        }
      } else {
        const index = commandManager.projectCommands.findIndex(cmd => cmd.id === editingCommand.id);
        if (index !== -1) {
          commandManager.projectCommands[index] = { ...command, id: editingCommand.id };
          commandManager.saveProjectCommands();
        }
      }
    } else {
      // 添加新命令
      if (activeTab === 'user') {
        commandManager.addUserCommand(command);
      } else {
        commandManager.addProjectCommand(command);
      }
    }

    // 更新状态
    setCommands({
      user: commandManager.userCommands,
      project: commandManager.projectCommands
    });

    // 重置表单
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'Development',
      description: '',
      icon: '⚡',
      examples: [''],
      flags: [],
      waveEnabled: false,
      autoActivates: []
    });
    setShowForm(false);
    setEditingCommand(null);
  };

  const handleEdit = (command) => {
    setFormData({
      name: command.name,
      category: command.category,
      description: command.description,
      icon: command.icon || '⚡',
      examples: command.examples && command.examples.length ? command.examples : [''],
      flags: command.flags || [],
      waveEnabled: command.waveEnabled || false,
      autoActivates: command.autoActivates || []
    });
    setEditingCommand(command);
    setShowForm(true);
  };

  const handleDelete = (command) => {
    if (confirm(`确定要删除命令 "${command.name}" 吗？`)) {
      commandManager.removeCommand(command.id);
      setCommands({
        user: commandManager.userCommands,
        project: commandManager.projectCommands
      });
    }
  };

  const currentCommands = commands[activeTab] || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            自定义Claude Code指令管理
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 标签页 */}
        <div className="flex border-b border-gray-200 dark:border-gray-600">
          <button
            onClick={() => setActiveTab('user')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'user'
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            👤 用户级指令 ({commands.user.length})
          </button>
          <button
            onClick={() => setActiveTab('project')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'project'
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            📁 项目级指令 ({commands.project.length})
          </button>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* 命令列表 */}
          <div className="flex-1 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {activeTab === 'user' ? '用户级指令' : '项目级指令'}
              </h3>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + 添加指令
              </button>
            </div>

            {/* 命令卡片列表 */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {currentCommands.map((command) => (
                <div
                  key={command.id}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{command.icon || '⚡'}</span>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-mono font-medium text-blue-600 dark:text-blue-400">
                            {command.name}
                          </span>
                          <span className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded">
                            {command.category}
                          </span>
                          {command.waveEnabled && (
                            <span className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                              🌊 Wave
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {command.description}
                        </p>
                        {command.examples && command.examples[0] && (
                          <div className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-600 dark:text-gray-400">
                            {command.examples[0]}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(command)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                        title="编辑"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(command)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                        title="删除"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {currentCommands.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <div className="text-4xl mb-4">📝</div>
                  <p>还没有{activeTab === 'user' ? '用户' : '项目'}级自定义指令</p>
                  <p className="text-sm">点击"添加指令"来创建你的第一个自定义指令</p>
                </div>
              )}
            </div>
          </div>

          {/* 表单侧边栏 */}
          {showForm && (
            <div className="w-96 border-l border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {editingCommand ? '编辑指令' : '添加指令'}
                  </h3>
                  <button
                    onClick={resetForm}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* 基本信息 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      命令名称 *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="/my-command"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      类别
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    >
                      {Object.keys(COMMAND_CATEGORIES).map(category => (
                        <option key={category} value={category}>
                          {COMMAND_CATEGORIES[category].icon} {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      图标
                    </label>
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => handleInputChange('icon', e.target.value)}
                      placeholder="⚡"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      描述 *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="描述这个命令的作用"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      required
                    />
                  </div>

                  {/* 示例 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      使用示例
                    </label>
                    {formData.examples.map((example, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={example}
                          onChange={(e) => handleArrayChange('examples', index, e.target.value)}
                          placeholder="/my-command 参数"
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                        />
                        {formData.examples.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeArrayItem('examples', index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayItem('examples')}
                      className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                    >
                      + 添加示例
                    </button>
                  </div>

                  {/* 选项 */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="waveEnabled"
                      checked={formData.waveEnabled}
                      onChange={(e) => handleInputChange('waveEnabled', e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="waveEnabled" className="text-sm text-gray-700 dark:text-gray-300">
                      启用Wave模式
                    </label>
                  </div>

                  {/* 提交按钮 */}
                  <div className="flex gap-2 pt-4">
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                    >
                      {editingCommand ? '更新指令' : '添加指令'}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm"
                    >
                      取消
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandManager;