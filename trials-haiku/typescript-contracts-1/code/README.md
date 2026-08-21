# Task Management API

A fully-typed TypeScript task management system built with Node.js built-in modules, implementing strict architectural constraints and an event-driven architecture.

## Architecture Overview

This system implements:
- **Event Bus Pattern**: Services communicate asynchronously through published/subscribed events
- **Service-Owned Data**: Each service maintains its own in-memory data store (Map)
- **No Cross-Service Imports**: Services never directly import from other services
- **HTTP Only in Router**: All HTTP handling is isolated to the router and main entry point
- **Forward-Only Status Machine**: Task status transitions follow strict: `todo → in-progress → done`
- **Zero External Dependencies**: Uses only Node.js built-in modules (http, crypto, url, etc.)

## Architecture Rules Enforced

✓ **RULE 1: NO_CROSS_SERVICE_IMPORTS** - Services only communicate via EventBus
✓ **RULE 2: EXCLUSIVE_DATA_OWNERSHIP** - Each service owns its private data store
✓ **RULE 3: HTTP_ONLY_IN_ROUTER** - No HTTP imports in service files
✓ **RULE 4: FORWARD_ONLY_STATUS** - Task status: todo → in-progress → done only
✓ **RULE 5: NO_EXTERNAL_PACKAGES** - Only Node.js built-in modules
✓ **RULE 6: ONE_SERVICE_PER_FILE** - Clear module boundaries

## File Structure

```
src/
├── event-bus.ts              # Event Bus implementation & interfaces
├── types.ts                  # All TypeScript type contracts
├── services/
│   ├── user-service.ts       # User CRUD operations
│   ├── project-service.ts    # Project management
│   ├── task-service.ts       # Task management + status FSM
│   ├── comment-service.ts    # Comments on tasks
│   └── notification-service.ts # Notification management
├── router.ts                 # HTTP request routing
├── main.ts                   # Application entry point & event wiring
├── demo.ts                   # Demo script
└── test.ts                   # Unit tests
```

## Services

### UserService
- `create(input)`: Create new user
- `getById(id)`: Get user by ID
- `getAll()`: Get all users
- `update(id, input)`: Update user
- `delete(id)`: Delete user

### ProjectService
- `create(input)`: Create project
- `getById(id)`: Get project details
- `getAll()`: Get all projects
- `update(id, input)`: Update project
- `delete(id)`: Delete project
- `addMember(projectId, userId)`: Add user to project
- `removeMember(projectId, userId)`: Remove user from project

### TaskService
Publishes events: `task.assigned`, `task.statusChanged`

- `create(input)`: Create task (starts as "todo")
- `getById(id)`: Get task details
- `getByProject(projectId)`: Get tasks in project
- `update(id, input)`: Update task title/description
- `delete(id)`: Delete task
- `assign(taskId, assigneeId)`: Assign task to user (publishes event)
- `changeStatus(taskId, newStatus)`: Change task status (enforces FSM, publishes event)

**Status Transitions (Strictly Enforced):**
```
todo → in-progress → done
```
Backward transitions and skipping transitions throw errors.

### CommentService
Publishes events: `comment.added`

- `create(input)`: Create comment on task (publishes event)
- `getById(id)`: Get comment details
- `getByTask(taskId)`: Get all comments on task
- `delete(id)`: Delete comment

### NotificationService
Subscribes to: `task.assigned`, `task.statusChanged`, `comment.added`

- `getByUser(userId)`: Get all notifications for user
- `markAsRead(notificationId)`: Mark notification as read

## Event Wiring

Automatic subscriptions set up in `Application.setupEventSubscriptions()`:

| Event | Publisher | Subscriber | Result |
|-------|-----------|-----------|--------|
| `task.assigned` | TaskService | NotificationService | Creates notification: "Task '{title}' assigned to you" |
| `task.statusChanged` | TaskService | NotificationService | Creates notification: "Task '{title}' status changed to {status}" |
| `comment.added` | CommentService | NotificationService | Creates notification for task assignee about new comment |

## API Routes

### Users
```
GET    /users                     → Get all users
POST   /users                     → Create user {name, email}
GET    /users/:id                 → Get user by ID
PUT    /users/:id                 → Update user {name?, email?}
DELETE /users/:id                 → Delete user
```

### Projects
```
GET    /projects                  → Get all projects
POST   /projects                  → Create project {name, description}
GET    /projects/:id              → Get project
PUT    /projects/:id              → Update project {name?, description?}
DELETE /projects/:id              → Delete project
POST   /projects/:id/members      → Add member {userId}
DELETE /projects/:id/members      → Remove member {userId}
```

### Tasks
```
GET    /tasks?projectId=X         → Get tasks by project
POST   /tasks                     → Create task {title, description, projectId}
GET    /tasks/:id                 → Get task
PUT    /tasks/:id                 → Update task {title?, description?}
DELETE /tasks/:id                 → Delete task
PUT    /tasks/:id/assign          → Assign task {assigneeId}
PUT    /tasks/:id/status          → Change status {status}
```

### Comments
```
GET    /comments?taskId=X         → Get task comments
POST   /comments                  → Create comment {taskId, authorId, body}
GET    /comments/:id              → Get comment
DELETE /comments/:id              → Delete comment
```

### Notifications
```
GET    /notifications?userId=X    → Get user notifications
PUT    /notifications/:id/read    → Mark as read
```

## Running the System

### Start the Server
```bash
npx tsx src/main.ts
```
Server starts on `http://localhost:3000`

### Run Tests
```bash
npx tsx src/test.ts
```
Unit tests validating all services and event wiring.

### Run Demo
```bash
npx tsx src/demo.ts
```
Interactive demo showing end-to-end workflow:
1. Creates users
2. Creates project
3. Adds members
4. Creates tasks
5. Assigns tasks (generates notifications)
6. Changes task status (generates notifications)
7. Adds comments (generates notifications)
8. Retrieves and displays notifications

### TypeScript Compilation
```bash
npx tsc --noEmit
```
Verify all files compile without errors.

## Implementation Highlights

### Event Bus
- Lightweight pub/sub with no external dependencies
- Callbacks automatically wrapped with error handling
- Supports multiple subscribers per event

### Service Data Stores
Each service owns a private `Map<string, Entity>`:
- UserService: `Map<string, User>`
- ProjectService: `Map<string, Project>`
- TaskService: `Map<string, Task>`
- CommentService: `Map<string, Comment>`
- NotificationService: `Map<string, Notification>`

### Task Status FSM
Strict state machine enforced in `TaskService.changeStatus()`:
```typescript
const validTransitions: Record<TaskStatus, TaskStatus[]> = {
  todo: ["in-progress"],
  "in-progress": ["done"],
  done: [],
};
```

### Error Handling
- Services throw descriptive errors for invalid operations
- Router catches all errors and returns appropriate HTTP status codes
- Event subscribers wrapped with try/catch to prevent cascade failures

## Type Safety

Full TypeScript strict mode enabled:
- `noImplicitAny`
- `strictNullChecks`
- `strictFunctionTypes`
- `strictPropertyInitialization`

All data models and service contracts defined in `types.ts` and `event-bus.ts`.

## Testing Results

✓ User service CRUD operations
✓ Project management and member management
✓ Task creation and assignment
✓ Status FSM enforcement (forward-only transitions)
✓ Comment creation and retrieval
✓ Event publishing and subscription
✓ Notification creation from events
✓ Invalid operation error handling

All tests passing with zero external dependencies!
