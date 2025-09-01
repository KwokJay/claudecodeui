-- 工作区管理系统数据库结构
-- 扩展现有 SQLite 数据库以支持工作区功能

-- 工作区表
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT '💼',
  settings TEXT, -- JSON 格式的设置
  layout TEXT,   -- JSON 格式的布局配置
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT FALSE,
  user_id TEXT, -- 关联用户ID
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 工作区项目关联表
CREATE TABLE IF NOT EXISTS workspace_projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  project_path TEXT NOT NULL,
  project_alias TEXT,
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
  custom_settings TEXT, -- JSON 格式的项目特定设置
  active_session_id TEXT,
  active_tab TEXT DEFAULT 'chat',
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  UNIQUE(workspace_id, project_path)
);

-- 工作区会话关联表
CREATE TABLE IF NOT EXISTS workspace_sessions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  session_name TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES workspace_projects(id) ON DELETE CASCADE
);

-- 工作区模板表
CREATE TABLE IF NOT EXISTS workspace_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  config TEXT NOT NULL, -- JSON 格式的模板配置
  created_by TEXT, -- 创建者用户ID
  is_public BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 工作区活动日志表
CREATE TABLE IF NOT EXISTS workspace_activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL,
  user_id TEXT,
  action TEXT NOT NULL, -- switch, create, delete, add_project, remove_project
  target_type TEXT, -- workspace, project, session
  target_id TEXT,
  details TEXT, -- JSON 格式的详细信息
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 工作区环境变量表
CREATE TABLE IF NOT EXISTS workspace_environments (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  env_name TEXT NOT NULL,
  env_value TEXT,
  is_encrypted BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  UNIQUE(workspace_id, env_name)
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_is_active ON workspaces(is_active);
CREATE INDEX IF NOT EXISTS idx_workspace_projects_workspace_id ON workspace_projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_projects_last_accessed ON workspace_projects(last_accessed DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_sessions_workspace_id ON workspace_sessions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_sessions_is_active ON workspace_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_workspace_activity_logs_workspace_id ON workspace_activity_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_activity_logs_created_at ON workspace_activity_logs(created_at DESC);

-- 触发器：自动更新 updated_at 字段
CREATE TRIGGER IF NOT EXISTS update_workspaces_updated_at
  AFTER UPDATE ON workspaces
BEGIN
  UPDATE workspaces SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_workspace_projects_updated_at
  AFTER UPDATE ON workspace_projects
BEGIN
  UPDATE workspace_projects SET last_accessed = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 触发器：记录工作区活动
CREATE TRIGGER IF NOT EXISTS log_workspace_creation
  AFTER INSERT ON workspaces
BEGIN
  INSERT INTO workspace_activity_logs (workspace_id, action, target_type, target_id, details)
  VALUES (NEW.id, 'create', 'workspace', NEW.id, 
          json_object('name', NEW.name, 'description', NEW.description));
END;

CREATE TRIGGER IF NOT EXISTS log_project_addition
  AFTER INSERT ON workspace_projects
BEGIN
  INSERT INTO workspace_activity_logs (workspace_id, action, target_type, target_id, details)
  VALUES (NEW.workspace_id, 'add_project', 'project', NEW.id,
          json_object('project_path', NEW.project_path, 'alias', NEW.project_alias));
END;

-- 视图：工作区统计信息
CREATE VIEW IF NOT EXISTS workspace_stats AS
SELECT 
  w.id,
  w.name,
  w.description,
  w.color,
  w.icon,
  w.created_at,
  w.updated_at,
  w.is_active,
  COUNT(wp.id) as project_count,
  COUNT(ws.id) as session_count,
  MAX(wp.last_accessed) as last_project_access,
  COUNT(CASE WHEN wp.is_pinned THEN 1 END) as pinned_projects
FROM workspaces w
LEFT JOIN workspace_projects wp ON w.id = wp.workspace_id
LEFT JOIN workspace_sessions ws ON w.id = ws.workspace_id
GROUP BY w.id;

-- 视图：用户工作区概览
CREATE VIEW IF NOT EXISTS user_workspace_overview AS
SELECT 
  u.id as user_id,
  u.username,
  COUNT(w.id) as total_workspaces,
  COUNT(CASE WHEN w.is_active THEN 1 END) as active_workspaces,
  SUM(ws.project_count) as total_projects,
  MAX(w.updated_at) as last_workspace_activity
FROM users u
LEFT JOIN workspaces w ON u.id = w.user_id
LEFT JOIN workspace_stats ws ON w.id = ws.id
GROUP BY u.id;

-- 默认数据插入
INSERT OR IGNORE INTO workspaces (id, name, description, color, icon, is_active, settings, layout)
VALUES (
  'default-workspace',
  '默认工作区',
  '系统默认创建的工作区',
  '#3B82F6',
  '🏠',
  TRUE,
  json_object(
    'defaultCLI', 'claude',
    'autoSave', true,
    'syncSettings', true,
    'notifications', json_object(
      'projectChanges', true,
      'buildStatus', true,
      'gitUpdates', true
    )
  ),
  json_object(
    'type', 'grid',
    'activeProjects', json_array(),
    'panelSizes', json_array()
  )
);

-- 数据完整性约束
PRAGMA foreign_keys = ON;