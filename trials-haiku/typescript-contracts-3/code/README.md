# Task Management API

A TypeScript-based Task Management API built with strict architectural constraints and an event-driven architecture. The system uses Node.js built-in modules only (no npm dependencies for app code) and implements a services-based architecture with event bus communication.

## Architecture Overview

### Key Principles

1. **Event Bus Communication**: Services communicate only through the Event Bus, maintaining loose coupling
2. **No Cross-Service Imports**: Services do not directly import each other
3. **Exclusive Data Ownership**: Each service owns its own in-memory data store
4. **HTTP-Only Router**: HTTP handling is isolated in the Router; services expose plain TypeScript methods
5. **State Machine Enforcement**: Task status follows strict forward-only transitions
6. **Zero External Dependencies**: Uses only Node.js built-in modules

### File Structure

```
src/
├── event-bus.ts                    # Event Bus implementation
├── services/
│   ├── user-service.ts             # User management
│   ├── project-service.ts          # Project management
│   ├── task-service.ts             # Task management with state machine
│   ├── comment-service.ts          # Comment management
│   └── notification-service.ts     # Notification management
├── router.ts                       # HTTP request routing and handling
├── main.ts                         # Entry point with event wiring
└── demo.ts                         # Demo script
```

## Services

### UserService
Manages user creation, retrieval, update, and deletion.

**Methods:**
- `create(input: { name: string; email: string }): User`
- `getById(id: string): User`
- `getAll(): User[]`
- `update(id: string, input: Partial<...>): User`
- `delete(id: string): void`

### ProjectService
Manages projects and project membership.

**Methods:**
- `create(input: { name: string; description: string }): Project`
- `getById(id: string): Project`
- `getAll(): Project[]`
- `update(id: string, input: Partial<...>): Project`
- `delete(id: string): void`
- `addMember(projectId: string, userId: string): Project`
- `removeMember(projectId: string, userId: string): Project`

### TaskService
Manages tasks with strict state machine enforcement.

**Methods:**
- `create(input: { title: string; description: string; projectId: string }): Task`
- `getById(id: string): Task`
- `getByProject(projectId: string): Task[]`
- `update(id: string, input: Partial<...>): Task`
- `delete(id: string): void`
- `assign(taskId: string, assigneeId: string): Task` → publishes `task.assigned`
- `changeStatus(taskId: string, newStatus: TaskStatus): Task` → publishes `task.statusChanged`

**State Machine (RULE 4):**
```
todo → in-progress → done
```
Backward transitions, skipping transitions, and other paths are rejected.

### CommentService
Manages comments on tasks.

**Methods:**
- `create(input: { taskId: string; authorId: string; body: string }): Comment`
- `getById(id: string): Comment`
- `getByTask(taskId: string): Comment[]`
- `delete(id: string): void`
- `publishCommentAdded(...): void` → publishes `comment.added`

### NotificationService
Manages user notifications (subscribe-only).

**Methods:**
- `getByUser(userId: string): Notification[]`
- `markAsRead(notificationId: string): Notification`

**Event Subscriptions:**
- `task.assigned` → Creates "Task assigned to you"
- `task.statusChanged` → Creates "Task status changed"
- `comment.added` → Creates "New comment on your task"

## Event Bus

The Event Bus is a pub/sub system that coordinates communication between services.

```typescript
interface IEventBus {
  publish(event: string, payload: unknown): void;
  subscribe(event: string, callback: (payload: unknown) => void): void;
}
```

**Events Published:**
- `task.assigned` → `TaskAssignedPayload`
- `task.statusChanged` → `TaskStatusChangedPayload`
- `comment.added` → `CommentAddedPayload`

## HTTP API

### Users
```
GET    /users                   → Get all users
POST   /users                   → Create user
GET    /users/:id               → Get user
PUT    /users/:id               → Update user
DELETE /users/:id               → Delete user
```

### Projects
```
GET    /projects                → Get all projects
POST   /projects                → Create project
GET    /projects/:id            → Get project
PUT    /projects/:id            → Update project
DELETE /projects/:id            → Delete project
POST   /projects/:id/members    → Add member (body: { userId })
DELETE /projects/:id/members    → Remove member (body: { userId })
```

### Tasks
```
GET    /tasks?projectId=X       → Get tasks by project
POST   /tasks                   → Create task
GET    /tasks/:id               → Get task
PUT    /tasks/:id               → Update task
DELETE /tasks/:id               → Delete task
PUT    /tasks/:id/status        → Change status (body: { status })
PUT    /tasks/:id/assign        → Assign task (body: { assigneeId })
```

### Comments
```
GET    /comments?taskId=X       → Get comments by task
POST   /comments                → Create comment
GET    /comments/:id            → Get comment
DELETE /comments/:id            → Delete comment
```

### Notifications
```
GET    /notifications?userId=X  → Get notifications for user
PUT    /notifications/:id/read  → Mark notification as read
```

## Running the System

### Install Dependencies
```bash
npm install
```

### Start the Server
```bash
npm start
# or
npx tsx src/main.ts
```
Server listens on `http://localhost:3000`

### Run the Demo
```bash
npm run demo
# or
npx tsx src/demo.ts
```

The demo script:
1. Creates 3 users
2. Creates a project
3. Adds users as members
4. Creates 3 tasks
5. Assigns tasks to users
6. Changes task statuses
7. Adds comments
8. Verifies notifications were created
9. Tests invalid state transitions
10. Tests HTTP API routing

### Type Checking
```bash
npm run typecheck
# or
npx tsc --noEmit
```

### Build
```bash
npm run build
# or
npx tsc
```

## Architecture Rules Enforcement

### RULE 1: NO_CROSS_SERVICE_IMPORTS
Services do not import from each other. They communicate exclusively through the Event Bus.

### RULE 2: EXCLUSIVE_DATA_OWNERSHIP
Each service declares a private `Map` for its data. No service exposes or accepts another service's data store.

### RULE 3: HTTP_ONLY_IN_ROUTER
Only `router.ts` and `main.ts` import Node.js `http` module. Services expose plain TypeScript methods.

### RULE 4: FORWARD_ONLY_STATUS
TaskService enforces: `todo → in-progress → done`. Invalid transitions throw errors.

### RULE 5: NO_EXTERNAL_PACKAGES
Only Node.js built-in modules are used:
- `http`
- `crypto`
- `url`
- `events`
- `util`
- `stream`
- `querystring`
- `path`
- `fs`

### RULE 6: ONE_SERVICE_PER_FILE
- Each service in separate file
- Event Bus in separate file
- Router in separate file
- Main entry point in separate file

## Data Models

### User
```typescript
interface User {
  id: string;
  name: string;
  email: string;
}
```

### Project
```typescript
interface Project {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}
```

### Task
```typescript
type TaskStatus = "todo" | "in-progress" | "done";

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string | null;
  projectId: string;
}
```

### Comment
```typescript
interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string; // ISO 8601
}
```

### Notification
```typescript
interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string; // ISO 8601
}
```

## Example Usage

### Create a User
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@example.com"}'
```

### Create a Project
```bash
curl -X POST http://localhost:3000/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "Website", "description": "Redesign website"}'
```

### Add a Member to Project
```bash
curl -X POST http://localhost:3000/projects/project-1/members \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-1"}'
```

### Create a Task
```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Design", "description": "Design mockups", "projectId": "project-1"}'
```

### Assign a Task
```bash
curl -X PUT http://localhost:3000/tasks/task-1/assign \
  -H "Content-Type: application/json" \
  -d '{"assigneeId": "user-1"}'
```

### Change Task Status
```bash
curl -X PUT http://localhost:3000/tasks/task-1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "in-progress"}'
```

### Get Notifications
```bash
curl 'http://localhost:3000/notifications?userId=user-1'
```

## Design Rationale

### Event Bus
Services don't need to know about each other. The NotificationService subscribes to events without TaskService knowing about it. Adding new event handlers requires zero changes to existing services.

### Service Data Ownership
Each service controls its own data store, preventing bugs from shared state. Cross-service queries go through the API/Router layer.

### Strict State Machine
Task status transitions are enforced at the service level, preventing invalid states from ever being created.

### No External Packages
The system is completely self-contained. No `npm install` overhead. Can run anywhere Node.js is available.

## Development

### Type Safety
All code is strictly typed with TypeScript's `strict: true` compiler option.

### Error Handling
Services throw descriptive errors on validation failures. The Router catches and returns appropriate HTTP error responses.

### In-Memory Storage
All data is stored in Maps. Data does not persist between server restarts (ideal for demos and testing).

## Future Enhancements

- Persistent storage (database)
- Authentication and authorization
- Pagination for list endpoints
- Filtering and sorting
- Batch operations
- WebSocket support for real-time updates
- Rate limiting
- Request/response compression

## License

ISC
