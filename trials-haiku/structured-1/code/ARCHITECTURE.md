# Task Management API - Architecture Documentation

## Overview

This is a demonstration of a clean, event-driven architecture for a Task Management API built with TypeScript and Node.js built-in modules only. The system showcases loose coupling between services through an in-memory event bus pattern.

## System Design Principles

### 1. **Decoupled Services via Event Bus**
Services never directly call each other. All inter-service communication happens through the Event Bus:
- Task Service publishes `task.assigned` and `task.statusChanged` events
- Comment Service publishes `comment.added` events
- Notification Service subscribes to all events and creates notifications
- Services are completely independent and testable in isolation

### 2. **Data Ownership**
Each service has exclusive ownership of its data store:
- User Service owns user data
- Project Service owns project data
- Task Service owns task data
- Comment Service owns comment data
- Notification Service owns notification data

This prevents shared-state bugs and makes data invariants clear.

### 3. **Single Responsibility**
Each file has one clear purpose:
- `event-bus.ts`: Pub/sub mechanism
- `router.ts`: HTTP request handling and routing
- `main.ts`: Server startup
- `services/*.ts`: Business logic
- `demo.ts`: End-to-end demonstration

### 4. **In-Memory Storage**
All data is stored in in-memory Maps. This is suitable for:
- Prototypes and POCs
- Development and testing
- Learning architectural patterns

For production, replace Maps with actual databases.

## Event Flow Examples

### Task Assignment Flow
```
Client Request
    ↓
PUT /tasks/:id/assign {assigneeId: "u1"}
    ↓
Router.handleTasks()
    ↓
TaskService.assign(taskId, assigneeId)
    ↓
Update task store
    ↓
EventBus.publish("task.assigned", {...})
    ↓
NotificationService subscriber triggered
    ↓
Create notification for assignee
    ↓
Response sent to client
```

### Status Change Flow
```
Client Request
    ↓
PUT /tasks/:id/status {status: "in-progress"}
    ↓
Router.handleTasks()
    ↓
TaskService.changeStatus(taskId, newStatus)
    ↓
Validate status transition (forward-only)
    ↓
Update task store
    ↓
EventBus.publish("task.statusChanged", {...})
    ↓
NotificationService subscriber triggered
    ↓
Create notification for assignee
    ↓
Response sent to client
```

### Comment Addition Flow
```
Client Request
    ↓
POST /comments {taskId, authorId, body}
    ↓
Router.handleComments()
    ↓
CommentService.create(taskId, authorId, body)
    ↓
Create comment in store
    ↓
Look up task and author for context
    ↓
EventBus.publish("comment.added", {...})
    ↓
NotificationService subscriber triggered
    ↓
Create notification for commenter
    ↓
Response sent to client
```

## Data Models

### User
```typescript
{
  id: string;          // "u1", "u2", etc.
  name: string;
  email: string;
}
```

### Project
```typescript
{
  id: string;          // "p1", "p2", etc.
  name: string;
  description: string;
  memberIds: string[]; // References to users
}
```

### Task
```typescript
{
  id: string;                      // "t1", "t2", etc.
  title: string;
  description: string;
  status: "todo" | "in-progress" | "done";
  assigneeId: string | null;       // References a user
  projectId: string;               // References a project
}
```

### Comment
```typescript
{
  id: string;        // "c1", "c2", etc.
  taskId: string;    // References a task
  authorId: string;  // References a user
  body: string;
  createdAt: Date;
}
```

### Notification
```typescript
{
  id: string;        // "n1", "n2", etc.
  userId: string;    // References a user
  message: string;
  read: boolean;
  createdAt: Date;
}
```

## Event Catalog

### task.assigned
**Published by:** TaskService.assign()
**Payload:**
```json
{
  "taskId": "t1",
  "taskTitle": "Design mockups",
  "assigneeId": "u1"
}
```
**Subscribers:** NotificationService

### task.statusChanged
**Published by:** TaskService.changeStatus()
**Payload:**
```json
{
  "taskId": "t1",
  "taskTitle": "Design mockups",
  "assigneeId": "u1",
  "oldStatus": "todo",
  "newStatus": "in-progress"
}
```
**Subscribers:** NotificationService

### comment.added
**Published by:** CommentService.create()
**Payload:**
```json
{
  "commentId": "c1",
  "taskId": "t1",
  "taskTitle": "Design mockups",
  "authorId": "u1",
  "authorName": "Alice"
}
```
**Subscribers:** NotificationService

## Service Contracts

### UserService
```typescript
create(name: string, email: string): User
getById(id: string): User | undefined
getAll(): User[]
update(id: string, updates: Partial<User>): User | undefined
delete(id: string): boolean
```

### ProjectService
```typescript
create(name: string, description: string): Project
getById(id: string): Project | undefined
getAll(): Project[]
update(id: string, updates: Partial<Project>): Project | undefined
delete(id: string): boolean
addMember(projectId: string, userId: string): Project | undefined
removeMember(projectId: string, userId: string): Project | undefined
```

### TaskService
```typescript
create(title: string, description: string, projectId: string): Task
getById(id: string): Task | undefined
getAll(): Task[]
getByProject(projectId: string): Task[]
update(id: string, updates: Partial<Task>): Task | undefined
delete(id: string): boolean
assign(taskId: string, assigneeId: string): Task | undefined
changeStatus(taskId: string, newStatus: TaskStatus): Task | undefined
```

### CommentService
```typescript
create(taskId: string, authorId: string, body: string): Comment
getById(id: string): Comment | undefined
getByTask(taskId: string): Comment[]
delete(id: string): boolean
```

### NotificationService
```typescript
getByUser(userId: string): Notification[]
markAsRead(notificationId: string): Notification | undefined
```

### EventBus
```typescript
publish(event: string, payload: any): void
subscribe(event: string, callback: (payload: any) => void): void
```

## Constraints & Rules

### No Direct Service Calls
❌ WRONG:
```typescript
// In CommentService
const task = taskService.getById(taskId);
```

✅ CORRECT:
```typescript
// In CommentService - only import taskService for lookups (with comment in code)
// But preferably, pass needed data through the Event Bus
```

### Status Transitions (Forward Only)
Task status can only progress:
- `todo` → `in-progress`
- `in-progress` → `done`

Backward transitions are not allowed and will throw an error.

### No External Dependencies
Only Node.js built-in modules:
- `http` - HTTP server
- `url` - URL parsing
- `crypto` - If needed for IDs (not used here)

No npm packages in the application code (only dev dependencies like TypeScript).

### Data Isolation
Services cannot read or write other services' data stores.

## Testing the System

### Start the Server
```bash
npm start
```

Server listens on `http://localhost:3000`

### Run the Demo
```bash
npm run demo
```

The demo:
1. Creates 3 users
2. Creates 1 project
3. Adds all users to the project
4. Creates 3 tasks
5. Assigns each task to a different user (triggers notifications)
6. Changes task statuses (triggers more notifications)
7. Adds comments (triggers notifications)
8. Verifies notifications were created
9. Marks a notification as read

### Manual Testing with cURL

Create a user:
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@example.com"}'
```

Create a task and assign it:
```bash
# Create task
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "My Task", "description": "Do something", "projectId": "p1"}'

# Assign task (returns task + publishes event + creates notification)
curl -X PUT http://localhost:3000/tasks/t1/assign \
  -H "Content-Type: application/json" \
  -d '{"assigneeId": "u1"}'

# Check notifications
curl http://localhost:3000/notifications?userId=u1
```

## Scalability Considerations

To scale this system:

1. **Replace In-Memory Storage**
   - Use PostgreSQL, MongoDB, or similar
   - Each service implements its own data access layer

2. **Replace Event Bus**
   - Use RabbitMQ, Apache Kafka, or AWS SNS/SQS
   - Maintains same publish/subscribe interface

3. **Add API Gateway**
   - Route requests through a reverse proxy
   - Implement rate limiting, authentication

4. **Microservices**
   - Each service could run as a separate process
   - Communicate via message queue instead of in-memory EventBus

5. **Caching**
   - Add Redis for frequently accessed data
   - Invalidate cache on events

The architecture supports these changes with minimal code modifications because services are decoupled.

## Files & Responsibilities

| File | Responsibility | Lines |
|------|-----------------|-------|
| `event-bus.ts` | Event publishing/subscription | ~40 |
| `services/user-service.ts` | User CRUD operations | ~60 |
| `services/project-service.ts` | Project CRUD + membership | ~95 |
| `services/task-service.ts` | Task CRUD + assignment + events | ~150 |
| `services/comment-service.ts` | Comment CRUD + events | ~80 |
| `services/notification-service.ts` | Notification CRUD + subscriptions | ~110 |
| `router.ts` | HTTP routing & request parsing | ~475 |
| `main.ts` | Server startup | ~30 |
| `demo.ts` | End-to-end demo | ~340 |

**Total: ~1,380 lines of TypeScript**

## Key Takeaways

1. **Event-driven architectures decouple services** - Each service is independent
2. **Data ownership prevents bugs** - Clear responsibility for each service's data
3. **No external dependencies simplifies** - Pure Node.js with standard modules
4. **Constraints drive good design** - Rules about no direct calls force better patterns
5. **Events are self-documenting** - Clear record of what happens in the system
6. **Scalability is built-in** - Easy to replace EventBus or storage layer

This system demonstrates how to build loosely coupled, maintainable services that communicate through events rather than direct dependencies.
