import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { UserService } from './user-service';
import { ProjectService } from './project-service';
import { TaskService } from './task-service';
import { CommentService } from './comment-service';
import { NotificationService } from './notification-service';
import { sendJsonResponse, sendErrorResponse, parseRequestBody } from './utils';
import { UserId, ProjectId, TaskId, CommentId, NotificationId, TaskStatus } from './types';

export class ApiRouter {
  private userService: UserService;
  private projectService: ProjectService;
  private taskService: TaskService;
  private commentService: CommentService;
  private notificationService: NotificationService;

  constructor(
    userService: UserService,
    projectService: ProjectService,
    taskService: TaskService,
    commentService: CommentService,
    notificationService: NotificationService
  ) {
    this.userService = userService;
    this.projectService = projectService;
    this.taskService = taskService;
    this.commentService = commentService;
    this.notificationService = notificationService;
  }

  public async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const parts = url.pathname.split('/').filter(Boolean);
    const method = req.method;

    try {
      const body = await parseRequestBody(req);

      // Users API
      if (parts[0] === 'users') {
        if (method === 'GET') {
          if (parts[1]) {
            // GET /users/:id
            const user = this.userService.getUser(parts[1] as UserId);
            return user ? sendJsonResponse(res, 200, user) : sendErrorResponse(res, 404, 'User not found');
          } else {
            // GET /users
            return sendJsonResponse(res, 200, this.userService.getAllUsers());
          }
        } else if (method === 'POST') {
          // POST /users
          if (!body.name || !body.email) {
            return sendErrorResponse(res, 400, 'Name and email are required');
          }
          const newUser = this.userService.createUser(body);
          return sendJsonResponse(res, 201, newUser);
        } else if (method === 'PUT') {
          // PUT /users/:id
          if (parts[1]) {
            const updatedUser = this.userService.updateUser(parts[1] as UserId, body);
            return updatedUser ? sendJsonResponse(res, 200, updatedUser) : sendErrorResponse(res, 404, 'User not found');
          }
        } else if (method === 'DELETE') {
          // DELETE /users/:id
          if (parts[1]) {
            const deleted = this.userService.deleteUser(parts[1] as UserId);
            return deleted ? sendJsonResponse(res, 204, {}) : sendErrorResponse(res, 404, 'User not found');
          }
        }
      }

      // Projects API
      if (parts[0] === 'projects') {
        if (method === 'GET') {
          if (parts[1] && parts[2] === 'members') {
            // This route isn't explicitly defined in spec, but good to have.
            const project = this.projectService.getProject(parts[1] as ProjectId);
            return project ? sendJsonResponse(res, 200, project.memberIds) : sendErrorResponse(res, 404, 'Project not found');
          } else if (parts[1]) {
            // GET /projects/:id
            const project = this.projectService.getProject(parts[1] as ProjectId);
            return project ? sendJsonResponse(res, 200, project) : sendErrorResponse(res, 404, 'Project not found');
          } else {
            // GET /projects
            return sendJsonResponse(res, 200, this.projectService.getAllProjects());
          }
        } else if (method === 'POST') {
          // POST /projects
          if (!body.name || !body.description) {
            return sendErrorResponse(res, 400, 'Name and description are required');
          }
          const newProject = this.projectService.createProject(body);
          return sendJsonResponse(res, 201, newProject);
        } else if (method === 'PUT') {
          // PUT /projects/:id
          if (parts[1]) {
            const updatedProject = this.projectService.updateProject(parts[1] as ProjectId, body);
            return updatedProject ? sendJsonResponse(res, 200, updatedProject) : sendErrorResponse(res, 404, 'Project not found');
          }
        } else if (method === 'DELETE') {
          // DELETE /projects/:id
          if (parts[1]) {
            const deleted = this.projectService.deleteProject(parts[1] as ProjectId);
            return deleted ? sendJsonResponse(res, 204, {}) : sendErrorResponse(res, 404, 'Project not found');
          }
        } else if (method === 'POST' && parts[1] && parts[2] === 'members') {
          // POST /projects/:id/members
          if (!body.userId) {
            return sendErrorResponse(res, 400, 'userId is required');
          }
          const project = this.projectService.addMember(parts[1] as ProjectId, body.userId as UserId);
          return project ? sendJsonResponse(res, 200, project) : sendErrorResponse(res, 404, 'Project or User not found');
        } else if (method === 'DELETE' && parts[1] && parts[2] === 'members') {
          // DELETE /projects/:id/members
          if (!body.userId) {
            return sendErrorResponse(res, 400, 'userId is required');
          }
          const project = this.projectService.removeMember(parts[1] as ProjectId, body.userId as UserId);
          return project ? sendJsonResponse(res, 200, project) : sendErrorResponse(res, 404, 'Project or User not found');
        }
      }

      // Tasks API
      if (parts[0] === 'tasks') {
        if (method === 'GET') {
          if (parts[1]) {
            // GET /tasks/:id
            const task = this.taskService.getTask(parts[1] as TaskId);
            return task ? sendJsonResponse(res, 200, task) : sendErrorResponse(res, 404, 'Task not found');
          } else {
            // GET /tasks?projectId=xxx
            const projectId = url.searchParams.get('projectId');
            if (projectId) {
              return sendJsonResponse(res, 200, this.taskService.getTasksByProject(projectId as ProjectId));
            } else {
              return sendJsonResponse(res, 200, this.taskService.getAllTasks());
            }
          }
        } else if (method === 'POST') {
          // POST /tasks
          if (!body.projectId || !body.title || !body.description || !body.status) {
            return sendErrorResponse(res, 400, 'projectId, title, description, and status are required');
          }
          const newTask = this.taskService.createTask(body);
          return sendJsonResponse(res, 201, newTask);
        } else if (method === 'PUT') {
          if (parts[1] && parts[2] === 'status') {
            // PUT /tasks/:id/status
            if (!body.status) {
              return sendErrorResponse(res, 400, 'Status is required');
            }
            try {
              const updatedTask = this.taskService.updateTaskStatus(parts[1] as TaskId, body.status as TaskStatus);
              return updatedTask ? sendJsonResponse(res, 200, updatedTask) : sendErrorResponse(res, 404, 'Task not found');
            } catch (error: any) {
              return sendErrorResponse(res, 400, error.message);
            }
          } else if (parts[1] && parts[2] === 'assign') {
            // PUT /tasks/:id/assign
            if (!body.assigneeId) {
              return sendErrorResponse(res, 400, 'Assignee ID is required');
            }
            const updatedTask = this.taskService.assignTask(parts[1] as TaskId, body.assigneeId as UserId);
            return updatedTask ? sendJsonResponse(res, 200, updatedTask) : sendErrorResponse(res, 404, 'Task not found');
          } else if (parts[1]) {
            // PUT /tasks/:id
            const updatedTask = this.taskService.updateTask(parts[1] as TaskId, body);
            return updatedTask ? sendJsonResponse(res, 200, updatedTask) : sendErrorResponse(res, 404, 'Task not found');
          }
        } else if (method === 'DELETE') {
          // DELETE /tasks/:id
          if (parts[1]) {
            const deleted = this.taskService.deleteTask(parts[1] as TaskId);
            return deleted ? sendJsonResponse(res, 204, {}) : sendErrorResponse(res, 404, 'Task not found');
          }
        }
      }

      // Comments API
      if (parts[0] === 'comments') {
        if (method === 'GET') {
          if (parts[1]) {
            // GET /comments/:id
            const comment = this.commentService.getComment(parts[1] as CommentId);
            return comment ? sendJsonResponse(res, 200, comment) : sendErrorResponse(res, 404, 'Comment not found');
          } else {
            // GET /comments?taskId=xxx
            const taskId = url.searchParams.get('taskId');
            if (taskId) {
              return sendJsonResponse(res, 200, this.commentService.getCommentsByTask(taskId as TaskId));
            } else {
              return sendJsonResponse(res, 200, this.commentService.getAllComments());
            }
          }
        } else if (method === 'POST') {
          // POST /comments
          if (!body.taskId || !body.authorId || !body.text) {
            return sendErrorResponse(res, 400, 'taskId, authorId, and text are required');
          }
          const newComment = this.commentService.createComment(body);
          return sendJsonResponse(res, 201, newComment);
        } else if (method === 'DELETE') {
          // DELETE /comments/:id
          if (parts[1]) {
            const deleted = this.commentService.deleteComment(parts[1] as CommentId);
            return deleted ? sendJsonResponse(res, 204, {}) : sendErrorResponse(res, 404, 'Comment not found');
          }
        }
      }

      // Notifications API
      if (parts[0] === 'notifications') {
        if (method === 'GET') {
          const userId = url.searchParams.get('userId');
          if (userId) {
            // GET /notifications?userId=xxx
            return sendJsonResponse(res, 200, this.notificationService.getNotificationsByUserId(userId as UserId));
          } else {
            return sendJsonResponse(res, 400, 'userId parameter is required for notifications');
          }
        } else if (method === 'PUT' && parts[1] && parts[2] === 'read') {
          // PUT /notifications/:id/read
          const updatedNotification = this.notificationService.markNotificationAsRead(parts[1] as NotificationId);
          return updatedNotification ? sendJsonResponse(res, 200, updatedNotification) : sendErrorResponse(res, 404, 'Notification not found');
        }
      }

      // If no route matches
      sendErrorResponse(res, 404, 'Not Found');
    } catch (error: any) {
      console.error('API Error:', error);
      sendErrorResponse(res, 500, error.message || 'Internal Server Error');
    }
  }
}
