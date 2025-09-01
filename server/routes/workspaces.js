/**
 * 工作区管理 API 路由
 * 提供工作区的 CRUD 操作和高级功能
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth.js';
import { db } from '../database/db.js';

const router = express.Router();

// 应用认证中间件
router.use(authenticateToken);

// 获取用户的所有工作区
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;

    const workspaces = db.prepare(`
      SELECT w.*, 
             COUNT(wp.id) as project_count,
             COUNT(ws.id) as session_count,
             MAX(wp.last_accessed) as last_project_access
      FROM workspaces w
      LEFT JOIN workspace_projects wp ON w.id = wp.workspace_id
      LEFT JOIN workspace_sessions ws ON w.id = ws.workspace_id
      WHERE w.user_id = ? OR w.user_id IS NULL
      GROUP BY w.id
      ORDER BY w.is_active DESC, w.updated_at DESC
    `).all(userId);

    // 解析 JSON 字段
    const formattedWorkspaces = workspaces.map(workspace => ({
      ...workspace,
      settings: workspace.settings ? JSON.parse(workspace.settings) : {},
      layout: workspace.layout ? JSON.parse(workspace.layout) : { type: 'grid' },
      projects: [], // 项目信息将在需要时单独加载
      project_count: workspace.project_count || 0,
      session_count: workspace.session_count || 0
    }));

    res.json({
      success: true,
      data: formattedWorkspaces
    });
  } catch (error) {
    console.error('获取工作区失败:', error);
    res.status(500).json({
      success: false,
      message: '获取工作区失败',
      error: error.message
    });
  }
});

// 获取特定工作区详情（包含项目列表）
router.get('/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user?.id;

    const workspace = db.prepare(`
      SELECT * FROM workspaces 
      WHERE id = ? AND (user_id = ? OR user_id IS NULL)
    `).get(workspaceId, userId);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: '工作区不存在'
      });
    }

    // 获取工作区的项目列表
    const projects = db.prepare(`
      SELECT * FROM workspace_projects 
      WHERE workspace_id = ?
      ORDER BY is_pinned DESC, last_accessed DESC
    `).all(workspaceId);

    // 获取工作区的会话列表
    const sessions = db.prepare(`
      SELECT ws.*, wp.project_path
      FROM workspace_sessions ws
      LEFT JOIN workspace_projects wp ON ws.project_id = wp.id
      WHERE ws.workspace_id = ?
      ORDER BY ws.updated_at DESC
    `).all(workspaceId);

    res.json({
      success: true,
      data: {
        ...workspace,
        settings: workspace.settings ? JSON.parse(workspace.settings) : {},
        layout: workspace.layout ? JSON.parse(workspace.layout) : { type: 'grid' },
        projects: projects.map(project => ({
          ...project,
          custom_settings: project.custom_settings ? JSON.parse(project.custom_settings) : {},
          position: { x: project.position_x, y: project.position_y }
        })),
        sessions
      }
    });
  } catch (error) {
    console.error('获取工作区详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取工作区详情失败',
      error: error.message
    });
  }
});

// 创建新工作区
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { name, description, color, icon, settings, layout } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: '工作区名称不能为空'
      });
    }

    const workspaceId = uuidv4();
    const now = new Date().toISOString();

    // 如果是第一个工作区，设置为激活状态
    const existingWorkspaces = db.prepare('SELECT COUNT(*) as count FROM workspaces WHERE user_id = ?').get(userId);
    const isFirstWorkspace = existingWorkspaces.count === 0;

    const stmt = db.prepare(`
      INSERT INTO workspaces (
        id, name, description, color, icon, settings, layout, 
        user_id, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      workspaceId,
      name.trim(),
      description || null,
      color || '#3B82F6',
      icon || '💼',
      JSON.stringify(settings || {}),
      JSON.stringify(layout || { type: 'grid' }),
      userId,
      isFirstWorkspace ? 1 : 0,
      now,
      now
    );

    // 如果设置为激活，取消其他工作区的激活状态
    if (isFirstWorkspace) {
      db.prepare('UPDATE workspaces SET is_active = 0 WHERE id != ? AND user_id = ?')
        .run(workspaceId, userId);
    }

    res.status(201).json({
      success: true,
      data: {
        id: workspaceId,
        name: name.trim(),
        description: description || null,
        color: color || '#3B82F6',
        icon: icon || '💼',
        settings: settings || {},
        layout: layout || { type: 'grid' },
        projects: [],
        is_active: isFirstWorkspace,
        created_at: now,
        updated_at: now
      }
    });
  } catch (error) {
    console.error('创建工作区失败:', error);
    res.status(500).json({
      success: false,
      message: '创建工作区失败',
      error: error.message
    });
  }
});

// 更新工作区信息
router.put('/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user?.id;
    const { name, description, color, icon, settings, layout } = req.body;

    const workspace = db.prepare(`
      SELECT id FROM workspaces 
      WHERE id = ? AND (user_id = ? OR user_id IS NULL)
    `).get(workspaceId, userId);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: '工作区不存在'
      });
    }

    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name.trim());
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (color !== undefined) {
      updateFields.push('color = ?');
      updateValues.push(color);
    }
    if (icon !== undefined) {
      updateFields.push('icon = ?');
      updateValues.push(icon);
    }
    if (settings !== undefined) {
      updateFields.push('settings = ?');
      updateValues.push(JSON.stringify(settings));
    }
    if (layout !== undefined) {
      updateFields.push('layout = ?');
      updateValues.push(JSON.stringify(layout));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有提供需要更新的字段'
      });
    }

    updateFields.push('updated_at = ?');
    updateValues.push(new Date().toISOString());
    updateValues.push(workspaceId);

    const stmt = db.prepare(`
      UPDATE workspaces 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `);

    stmt.run(...updateValues);

    res.json({
      success: true,
      message: '工作区更新成功'
    });
  } catch (error) {
    console.error('更新工作区失败:', error);
    res.status(500).json({
      success: false,
      message: '更新工作区失败',
      error: error.message
    });
  }
});

// 激活工作区
router.post('/:workspaceId/activate', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user?.id;

    const workspace = db.prepare(`
      SELECT id FROM workspaces 
      WHERE id = ? AND (user_id = ? OR user_id IS NULL)
    `).get(workspaceId, userId);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: '工作区不存在'
      });
    }

    // 使用事务确保原子性
    db.transaction(() => {
      // 取消所有工作区的激活状态
      db.prepare('UPDATE workspaces SET is_active = 0 WHERE user_id = ?').run(userId);
      
      // 激活指定工作区
      db.prepare('UPDATE workspaces SET is_active = 1, updated_at = ? WHERE id = ?')
        .run(new Date().toISOString(), workspaceId);
    })();

    res.json({
      success: true,
      message: '工作区激活成功'
    });
  } catch (error) {
    console.error('激活工作区失败:', error);
    res.status(500).json({
      success: false,
      message: '激活工作区失败',
      error: error.message
    });
  }
});

// 删除工作区
router.delete('/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user?.id;

    const workspace = db.prepare(`
      SELECT * FROM workspaces 
      WHERE id = ? AND (user_id = ? OR user_id IS NULL)
    `).get(workspaceId, userId);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: '工作区不存在'
      });
    }

    // 检查是否是最后一个工作区
    const workspaceCount = db.prepare('SELECT COUNT(*) as count FROM workspaces WHERE user_id = ?').get(userId);
    if (workspaceCount.count === 1) {
      return res.status(400).json({
        success: false,
        message: '不能删除最后一个工作区'
      });
    }

    // 使用事务删除工作区及相关数据
    db.transaction(() => {
      // 删除工作区（级联删除项目和会话）
      db.prepare('DELETE FROM workspaces WHERE id = ?').run(workspaceId);
      
      // 如果删除的是激活的工作区，激活另一个工作区
      if (workspace.is_active) {
        const firstWorkspace = db.prepare(`
          SELECT id FROM workspaces 
          WHERE user_id = ? 
          ORDER BY updated_at DESC 
          LIMIT 1
        `).get(userId);
        
        if (firstWorkspace) {
          db.prepare('UPDATE workspaces SET is_active = 1 WHERE id = ?')
            .run(firstWorkspace.id);
        }
      }
    })();

    res.json({
      success: true,
      message: '工作区删除成功'
    });
  } catch (error) {
    console.error('删除工作区失败:', error);
    res.status(500).json({
      success: false,
      message: '删除工作区失败',
      error: error.message
    });
  }
});

// 添加项目到工作区
router.post('/:workspaceId/projects', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user?.id;
    const { project_path, alias, position, pinned, custom_settings } = req.body;

    if (!project_path || !project_path.trim()) {
      return res.status(400).json({
        success: false,
        message: '项目路径不能为空'
      });
    }

    const workspace = db.prepare(`
      SELECT id FROM workspaces 
      WHERE id = ? AND (user_id = ? OR user_id IS NULL)
    `).get(workspaceId, userId);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: '工作区不存在'
      });
    }

    // 检查项目是否已存在
    const existingProject = db.prepare(`
      SELECT id FROM workspace_projects 
      WHERE workspace_id = ? AND project_path = ?
    `).get(workspaceId, project_path.trim());

    if (existingProject) {
      return res.status(400).json({
        success: false,
        message: '项目已存在于此工作区'
      });
    }

    const projectId = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO workspace_projects (
        id, workspace_id, project_path, project_alias,
        position_x, position_y, is_pinned, custom_settings,
        last_accessed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      projectId,
      workspaceId,
      project_path.trim(),
      alias || null,
      position?.x || 0,
      position?.y || 0,
      pinned ? 1 : 0,
      custom_settings ? JSON.stringify(custom_settings) : null,
      now
    );

    // 更新工作区的修改时间
    db.prepare('UPDATE workspaces SET updated_at = ? WHERE id = ?')
      .run(now, workspaceId);

    res.status(201).json({
      success: true,
      data: {
        id: projectId,
        workspace_id: workspaceId,
        project_path: project_path.trim(),
        project_alias: alias || null,
        position: position || { x: 0, y: 0 },
        is_pinned: pinned || false,
        custom_settings: custom_settings || {},
        last_accessed: now
      }
    });
  } catch (error) {
    console.error('添加项目失败:', error);
    res.status(500).json({
      success: false,
      message: '添加项目失败',
      error: error.message
    });
  }
});

// 从工作区移除项目
router.delete('/:workspaceId/projects/:projectId', async (req, res) => {
  try {
    const { workspaceId, projectId } = req.params;
    const userId = req.user?.id;

    const workspace = db.prepare(`
      SELECT id FROM workspaces 
      WHERE id = ? AND (user_id = ? OR user_id IS NULL)
    `).get(workspaceId, userId);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: '工作区不存在'
      });
    }

    const result = db.prepare(`
      DELETE FROM workspace_projects 
      WHERE id = ? AND workspace_id = ?
    `).run(projectId, workspaceId);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    // 更新工作区的修改时间
    db.prepare('UPDATE workspaces SET updated_at = ? WHERE id = ?')
      .run(new Date().toISOString(), workspaceId);

    res.json({
      success: true,
      message: '项目移除成功'
    });
  } catch (error) {
    console.error('移除项目失败:', error);
    res.status(500).json({
      success: false,
      message: '移除项目失败',
      error: error.message
    });
  }
});

// 更新项目信息
router.put('/:workspaceId/projects/:projectId', async (req, res) => {
  try {
    const { workspaceId, projectId } = req.params;
    const userId = req.user?.id;
    const { alias, position, pinned, custom_settings, active_session_id, active_tab } = req.body;

    const workspace = db.prepare(`
      SELECT id FROM workspaces 
      WHERE id = ? AND (user_id = ? OR user_id IS NULL)
    `).get(workspaceId, userId);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: '工作区不存在'
      });
    }

    const updateFields = [];
    const updateValues = [];

    if (alias !== undefined) {
      updateFields.push('project_alias = ?');
      updateValues.push(alias);
    }
    if (position !== undefined) {
      updateFields.push('position_x = ?, position_y = ?');
      updateValues.push(position.x, position.y);
    }
    if (pinned !== undefined) {
      updateFields.push('is_pinned = ?');
      updateValues.push(pinned ? 1 : 0);
    }
    if (custom_settings !== undefined) {
      updateFields.push('custom_settings = ?');
      updateValues.push(JSON.stringify(custom_settings));
    }
    if (active_session_id !== undefined) {
      updateFields.push('active_session_id = ?');
      updateValues.push(active_session_id);
    }
    if (active_tab !== undefined) {
      updateFields.push('active_tab = ?');
      updateValues.push(active_tab);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有提供需要更新的字段'
      });
    }

    // 添加最后访问时间更新
    updateFields.push('last_accessed = ?');
    updateValues.push(new Date().toISOString());
    updateValues.push(projectId, workspaceId);

    const stmt = db.prepare(`
      UPDATE workspace_projects 
      SET ${updateFields.join(', ')} 
      WHERE id = ? AND workspace_id = ?
    `);

    const result = stmt.run(...updateValues);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    res.json({
      success: true,
      message: '项目更新成功'
    });
  } catch (error) {
    console.error('更新项目失败:', error);
    res.status(500).json({
      success: false,
      message: '更新项目失败',
      error: error.message
    });
  }
});

// 批量操作项目
router.post('/:workspaceId/projects/batch', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user?.id;
    const { operation, project_ids, options } = req.body;

    if (!operation || !project_ids || !Array.isArray(project_ids)) {
      return res.status(400).json({
        success: false,
        message: '操作类型和项目ID列表不能为空'
      });
    }

    const workspace = db.prepare(`
      SELECT id FROM workspaces 
      WHERE id = ? AND (user_id = ? OR user_id IS NULL)
    `).get(workspaceId, userId);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: '工作区不存在'
      });
    }

    const results = [];
    const now = new Date().toISOString();

    for (const projectId of project_ids) {
      try {
        let result;
        switch (operation) {
          case 'pin':
            result = db.prepare(`
              UPDATE workspace_projects 
              SET is_pinned = 1, last_accessed = ? 
              WHERE id = ? AND workspace_id = ?
            `).run(now, projectId, workspaceId);
            break;
            
          case 'unpin':
            result = db.prepare(`
              UPDATE workspace_projects 
              SET is_pinned = 0, last_accessed = ? 
              WHERE id = ? AND workspace_id = ?
            `).run(now, projectId, workspaceId);
            break;
            
          case 'remove':
            result = db.prepare(`
              DELETE FROM workspace_projects 
              WHERE id = ? AND workspace_id = ?
            `).run(projectId, workspaceId);
            break;
            
          case 'update_position':
            if (options?.positions?.[projectId]) {
              const pos = options.positions[projectId];
              result = db.prepare(`
                UPDATE workspace_projects 
                SET position_x = ?, position_y = ?, last_accessed = ? 
                WHERE id = ? AND workspace_id = ?
              `).run(pos.x, pos.y, now, projectId, workspaceId);
            }
            break;
            
          default:
            throw new Error(`未知操作: ${operation}`);
        }
        
        results.push({
          project_id: projectId,
          success: result.changes > 0,
          message: result.changes > 0 ? '操作成功' : '项目不存在'
        });
      } catch (error) {
        results.push({
          project_id: projectId,
          success: false,
          message: error.message
        });
      }
    }

    // 更新工作区的修改时间
    db.prepare('UPDATE workspaces SET updated_at = ? WHERE id = ?')
      .run(now, workspaceId);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('批量操作失败:', error);
    res.status(500).json({
      success: false,
      message: '批量操作失败',
      error: error.message
    });
  }
});

// 获取工作区统计信息
router.get('/:workspaceId/stats', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user?.id;

    const workspace = db.prepare(`
      SELECT id FROM workspaces 
      WHERE id = ? AND (user_id = ? OR user_id IS NULL)
    `).get(workspaceId, userId);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: '工作区不存在'
      });
    }

    // 获取统计信息
    const stats = db.prepare(`
      SELECT 
        COUNT(wp.id) as total_projects,
        COUNT(CASE WHEN wp.is_pinned THEN 1 END) as pinned_projects,
        COUNT(ws.id) as total_sessions,
        COUNT(CASE WHEN ws.is_active THEN 1 END) as active_sessions,
        MAX(wp.last_accessed) as last_project_access,
        MIN(wp.last_accessed) as first_project_access
      FROM workspaces w
      LEFT JOIN workspace_projects wp ON w.id = wp.workspace_id
      LEFT JOIN workspace_sessions ws ON w.id = ws.workspace_id
      WHERE w.id = ?
    `).get(workspaceId);

    // 获取最近活动
    const recentActivity = db.prepare(`
      SELECT action, target_type, details, created_at
      FROM workspace_activity_logs 
      WHERE workspace_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).all(workspaceId);

    res.json({
      success: true,
      data: {
        stats: {
          ...stats,
          recent_activity: recentActivity.map(activity => ({
            ...activity,
            details: activity.details ? JSON.parse(activity.details) : {}
          }))
        }
      }
    });
  } catch (error) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计信息失败',
      error: error.message
    });
  }
});

export default router;