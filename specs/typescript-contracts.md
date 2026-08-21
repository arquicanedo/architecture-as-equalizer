# Task Management API — TypeScript Contracts + Architecture Rules

## Type Contracts

The following TypeScript interfaces define the exact data models and service contracts for the system. Implement these interfaces exactly as specified.

```typescript
// ============================================================
// Data Models
// ============================================================

interface User {
  id: string;
  name: string;
  email: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

type TaskStatus = "todo" | "in-progress" | "done";

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string | null;
  projectId: string;
}

interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string; // ISO 8601
}

interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string; // ISO 8601
}

// ============================================================
// Event Bus Contract
// ============================================================

interface IEventBus {
  publish(event: string, payload: unknown): void;
  subscribe(event: string, callback: (payload: unknown) => void): void;
}

// Event payloads
interface TaskAssignedPayload {
  taskId: string;
  taskTitle: string;
  assigneeId: string;
}

interface TaskStatusChangedPayload {
  taskId: string;
  taskTitle: string;
  assigneeId: string | null;
  oldStatus: TaskStatus;
  newStatus: TaskStatus;
}

interface CommentAddedPayload {
  commentId: string;
  taskId: string;
  taskTitle: string;
  authorId: string;
  authorName: string;
}

// ============================================================
// Service Contracts
// ============================================================

interface IUserService {
  create(input: { name: string; email: string }): User;
  getById(id: string): User;
  getAll(): User[];
  update(id: string, input: Partial<{ name: string; email: string }>): User;
  delete(id: string): void;
}

interface IProjectService {
  create(input: { name: string; description: string }): Project;
  getById(id: string): Project;
  getAll(): Project[];
  update(id: string, input: Partial<{ name: string; description: string }>): Project;
  delete(id: string): void;
  addMember(projectId: string, userId: string): Project;
  removeMember(projectId: string, userId: string): Project;
}

interface ITaskService {
  create(input: { title: string; description: string; projectId: string }): Task;
  getById(id: string): Task;
  getByProject(projectId: string): Task[];
  update(id: string, input: Partial<{ title: string; description: string }>): Task;
  delete(id: string): void;
  assign(taskId: string, assigneeId: string): Task;
  changeStatus(taskId: string, newStatus: TaskStatus): Task;
}

interface ICommentService {
  create(input: { taskId: string; authorId: string; body: string }): Comment;
  getById(id: string): Comment;
  getByTask(taskId: string): Comment[];
  delete(id: string): void;
}

interface INotificationService {
  getByUser(userId: string): Notification[];
  markAsRead(notificationId: string): Notification;
}
```

## Architecture Rules

These rules MUST be enforced in the implementation. Think of these as ArchUnit-style constraints that would be automatically checked:

```
RULE 1: NO_CROSS_SERVICE_IMPORTS
  Files matching "services/*-service.ts"
    MUST NOT import from other files matching "services/*-service.ts"
  EXCEPT: importing shared type definitions is allowed
  REASON: Services communicate only through the Event Bus

RULE 2: EXCLUSIVE_DATA_OWNERSHIP
  Each service class MUST declare its own private data store (Map)
  No service MUST export its internal data store
  No service MUST accept another service's store as a parameter
  REASON: Prevents shared-state bugs and maintains data invariants

RULE 3: HTTP_ONLY_IN_ROUTER
  Files matching "services/*-service.ts" MUST NOT import "http" or "node:http"
  Files matching "services/*-service.ts" MUST NOT reference IncomingMessage or ServerResponse
  Only "router.ts" and "main.ts" may handle HTTP
  REASON: Services expose plain TypeScript methods, not HTTP endpoints

RULE 4: FORWARD_ONLY_STATUS
  TaskService.changeStatus() MUST enforce: todo → in-progress → done
  Backward transitions (done → in-progress, in-progress → todo, done → todo) MUST throw an error
  Skipping transitions (todo → done) MUST throw an error
  REASON: Task lifecycle is a strict state machine

RULE 5: NO_EXTERNAL_PACKAGES
  No file MUST import from packages not in Node.js built-in modules
  Allowed: "http", "crypto", "url", "events", "util", "stream", "querystring", "path", "fs"
  Allowed with "node:" prefix: all of the above
  REASON: System must be self-contained, zero npm dependencies for app code

RULE 6: ONE_SERVICE_PER_FILE
  Each service (User, Project, Task, Comment, Notification) MUST be in its own file
  Event Bus MUST be in its own file
  Router MUST be in its own file
  Main entry point MUST be in its own file
  REASON: Clear module boundaries matching architectural boundaries
```

## Event Wiring

The following event subscriptions MUST be set up in the main entry point:

```
TaskService publishes:
  "task.assigned"       → payload: TaskAssignedPayload
  "task.statusChanged"  → payload: TaskStatusChangedPayload

CommentService publishes:
  "comment.added"       → payload: CommentAddedPayload

NotificationService subscribes to:
  "task.assigned"       → creates notification: "Task '{taskTitle}' assigned to you"
  "task.statusChanged"  → creates notification: "Task '{taskTitle}' status changed to {newStatus}"
  "comment.added"       → creates notification for task assignee about new comment
```

## API Route Mapping

The API Router handles all HTTP requests using Node.js built-in `http` module. All request/response bodies are JSON.

```
GET    /users                    → UserService.getAll()
POST   /users                    → UserService.create(body)
GET    /users/:id                → UserService.getById(id)
PUT    /users/:id                → UserService.update(id, body)
DELETE /users/:id                → UserService.delete(id)

GET    /projects                 → ProjectService.getAll()
POST   /projects                 → ProjectService.create(body)
GET    /projects/:id             → ProjectService.getById(id)
PUT    /projects/:id             → ProjectService.update(id, body)
DELETE /projects/:id             → ProjectService.delete(id)
POST   /projects/:id/members     → ProjectService.addMember(id, body.userId)
DELETE /projects/:id/members     → ProjectService.removeMember(id, body.userId)

GET    /tasks?projectId=X        → TaskService.getByProject(projectId)
POST   /tasks                    → TaskService.create(body)
GET    /tasks/:id                → TaskService.getById(id)
PUT    /tasks/:id                → TaskService.update(id, body)
DELETE /tasks/:id                → TaskService.delete(id)
PUT    /tasks/:id/status         → TaskService.changeStatus(id, body.status)
PUT    /tasks/:id/assign         → TaskService.assign(id, body.assigneeId)

GET    /comments?taskId=X        → CommentService.getByTask(taskId)
POST   /comments                 → CommentService.create(body)
GET    /comments/:id             → CommentService.getById(id)
DELETE /comments/:id             → CommentService.delete(id)

GET    /notifications?userId=X   → NotificationService.getByUser(userId)
PUT    /notifications/:id/read   → NotificationService.markAsRead(id)
```

## Design Decisions

### Why Event Bus over Direct Calls
Services communicate only through the Event Bus. This keeps services decoupled — adding a new service that reacts to events requires zero changes to existing services. The tradeoff is slightly harder execution tracing and no compile-time guarantee that subscribers exist.

### Why Service-Owned Data Stores
Each service maintains its own in-memory Map. This prevents shared-state bugs and gives each service full control over its data invariants. Cross-service queries require coordination through the router.

### Why No External Frameworks
The system uses Node.js built-in `http` module only. This keeps it self-contained with zero setup, at the cost of more boilerplate for request parsing and routing.

## File Structure

```
src/
├── event-bus.ts          # IEventBus implementation
├── services/
│   ├── user-service.ts       # IUserService implementation
│   ├── project-service.ts    # IProjectService implementation
│   ├── task-service.ts       # ITaskService implementation
│   ├── comment-service.ts    # ICommentService implementation
│   └── notification-service.ts  # INotificationService implementation
├── router.ts             # API Router — HTTP handling only
├── main.ts               # Entry point: wiring + server start
└── demo.ts               # Demo script exercising all features
```

## Demo Script

Include a demo script that starts the server and runs through: create users → create project → add members → create tasks → assign tasks → change status → add comments → check notifications. Validates the end-to-end flow.
