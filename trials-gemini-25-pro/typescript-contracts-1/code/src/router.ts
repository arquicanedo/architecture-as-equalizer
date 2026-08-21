import * as http from 'node:http';
import * as url from 'node:url';
import {
  ICommentService,
  IProjectService,
  ITaskService,
  IUserService,
  INotificationService,
} from './types';

export class ApiRouter {
  constructor(
    private userService: IUserService,
    private projectService: IProjectService,
    private taskService: ITaskService,
    private commentService: ICommentService,
    private notificationService: INotificationService
  ) {}

  public handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): void {
    const { method, url: reqUrl } = req;
    const parsedUrl = url.parse(reqUrl || '', true);
    const pathname = parsedUrl.pathname || '';

    this.logRequest(method, pathname);

    res.setHeader('Content-Type', 'application/json');

    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const requestBody = body ? JSON.parse(body) : {};
        const segments = pathname.split('/').filter(Boolean);

        if (method === 'GET' && pathname === '/users') {
          this.handleSuccess(res, this.userService.getAll());
        } else if (method === 'POST' && pathname === '/users') {
          this.handleSuccess(res, this.userService.create(requestBody), 201);
        } else if (method === 'GET' && segments[0] === 'users' && segments[1]) {
          this.handleSuccess(res, this.userService.getById(segments[1]));
        } else if (method === 'PUT' && segments[0] === 'users' && segments[1]) {
          this.handleSuccess(
            res,
            this.userService.update(segments[1], requestBody)
          );
        } else if (method === 'DELETE' && segments[0] === 'users' && segments[1]) {
          this.userService.delete(segments[1]);
          res.statusCode = 204;
          res.end();
        } else if (method === 'GET' && pathname === '/projects') {
          this.handleSuccess(res, this.projectService.getAll());
        } else if (method === 'POST' && pathname === '/projects') {
          this.handleSuccess(res, this.projectService.create(requestBody), 201);
        } else if (
          method === 'GET' &&
          segments[0] === 'projects' &&
          segments[1]
        ) {
          this.handleSuccess(res, this.projectService.getById(segments[1]));
        } else if (
          method === 'PUT' &&
          segments[0] === 'projects' &&
          segments[1]
        ) {
          this.handleSuccess(
            res,
            this.projectService.update(segments[1], requestBody)
          );
        } else if (
          method === 'DELETE' &&
          segments[0] === 'projects' &&
          segments[1]
        ) {
          this.projectService.delete(segments[1]);
          res.statusCode = 204;
          res.end();
        } else if (
          method === 'POST' &&
          segments[0] === 'projects' &&
          segments[1] &&
          segments[2] === 'members'
        ) {
          this.handleSuccess(
            res,
            this.projectService.addMember(segments[1], requestBody.userId)
          );
        } else if (
          method === 'DELETE' &&
          segments[0] === 'projects' &&
          segments[1] &&
          segments[2] === 'members'
        ) {
          this.handleSuccess(
            res,
            this.projectService.removeMember(segments[1], requestBody.userId)
          );
        } else if (method === 'GET' && pathname === '/tasks') {
          const projectId = parsedUrl.query.projectId as string;
          this.handleSuccess(res, this.taskService.getByProject(projectId));
        } else if (method === 'POST' && pathname === '/tasks') {
          this.handleSuccess(res, this.taskService.create(requestBody), 201);
        } else if (method === 'GET' && segments[0] === 'tasks' && segments[1]) {
          this.handleSuccess(res, this.taskService.getById(segments[1]));
        } else if (method === 'PUT' && segments[0] === 'tasks' && segments[1]) {
          this.handleSuccess(
            res,
            this.taskService.update(segments[1], requestBody)
          );
        } else if (
          method === 'DELETE' &&
          segments[0] === 'tasks' &&
          segments[1]
        ) {
          this.taskService.delete(segments[1]);
          res.statusCode = 204;
          res.end();
        } else if (
          method === 'PUT' &&
          segments[0] === 'tasks' &&
          segments[1] &&
          segments[2] === 'status'
        ) {
          this.handleSuccess(
            res,
            this.taskService.changeStatus(segments[1], requestBody.status)
          );
        } else if (
          method === 'PUT' &&
          segments[0] === 'tasks' &&
          segments[1] &&
          segments[2] === 'assign'
        ) {
          this.handleSuccess(
            res,
            this.taskService.assign(segments[1], requestBody.assigneeId)
          );
        } else if (method === 'GET' && pathname === '/comments') {
          const taskId = parsedUrl.query.taskId as string;
          this.handleSuccess(res, this.commentService.getByTask(taskId));
        } else if (method === 'POST' && pathname === '/comments') {
          this.handleSuccess(res, this.commentService.create(requestBody), 201);
        } else if (
          method === 'GET' &&
          segments[0] === 'comments' &&
          segments[1]
        ) {
          this.handleSuccess(res, this.commentService.getById(segments[1]));
        } else if (
          method === 'DELETE' &&
          segments[0] === 'comments' &&
          segments[1]
        ) {
          this.commentService.delete(segments[1]);
          res.statusCode = 204;
          res.end();
        } else if (method === 'GET' && pathname === '/notifications') {
          const userId = parsedUrl.query.userId as string;
          this.handleSuccess(res, this.notificationService.getByUser(userId));
        } else if (
          method === 'PUT' &&
          segments[0] === 'notifications' &&
          segments[1] &&
          segments[2] === 'read'
        ) {
          this.handleSuccess(
            res,
            this.notificationService.markAsRead(segments[1])
          );
        } else {
          this.handleError(res, new Error('Not Found'), 404);
        }
      } catch (error) {
        this.handleError(res, error as Error);
      }
    });
  }

  private handleSuccess(res: http.ServerResponse, data: any, statusCode = 200) {
    if(data === undefined) {
        return this.handleError(res, new Error('Not Found'), 404);
    }
    res.statusCode = statusCode;
    res.end(JSON.stringify(data));
  }

  private handleError(res: http.ServerResponse, error: Error, statusCode = 500) {
    console.error(error);
    res.statusCode = statusCode;
    res.end(JSON.stringify({ message: error.message }));
  }

  private logRequest(method: string | undefined, pathname: string) {
      console.log(`[${new Date().toISOString()}] ${method} ${pathname}`);
  }
}
