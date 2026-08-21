# Task Management API - Architecture Documentation

## System Overview

This is a **multi-service event-driven task management system** built with TypeScript and Node.js. The system demonstrates best practices for:

1. **Decoupled Service Architecture** - Services communicate through an event bus, not direct calls
2. **Data Isolation** - Each service owns its data store exclusively
3. **Clean Boundaries** - Clear separation of concerns through HTTP routing
4. **Forward-Only State Transitions** - Tasks follow a defined workflow
5. **In-Memory Data Storage** - All data is stored in-memory for simplicity

## Architecture Diagram

```
┌─────────────┐
│ HTTP Client │
└──────┬──────┘
       │ HTTP JSON
       ▼
┌──────────────────┐
│  API Router      │ (src/router.ts)
│  Single Entry    │
│  Point           │
└──────┬───────────┘
       │
       ├─────────────────┬─────────────────┬──────────────────┬──────────────────┬──────────────────┐
       │                 │                 │                  │                  │                  │
       ▼                 ▼                 ▼                  ▼                  ▼                  ▼
    ┌─────────┐     ┌─────────┐     ┌──────────┐        ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
    │ User    │     │ Project │     │ Task     │        │ Comment     │  │ Notification │  │ Event Bus    │
    │ Service │     │ Service │     │ Service  │        │ Service     │  │ Service      │  │ (Pub/Sub)    │
    └────┬────┘     └────┬────┘     └────┬─────┘        └────┬────────┘  └────────┬─────┘  └──────────────┘
         │               │               │                   │                    │              ▲
         │               │               │                   │                    │              │
         ▼               ▼               ▼                   ▼                    ▼              │
    ┌─────────┐     ┌─────────┐     ┌──────────┐        ┌─────────────┐  ┌──────────────┐  │
    │ User    │     │ Project │     │ Task     │        │ Comment     │  │ Notification │  │
    │ Store   │     │ Store   │     │ Store    │        │ Store       │  │ Store        │  │
    │ (Map)   │     │ (Map)   │     │ (Map)    │        │ (Map)       │  │ (Map)        │  │
    └─────────┘     └─────────┘     └──────────┘        └─────────────┘  └──────────────┘  │
                                            │                   │                           │
                                            └───publish─────────┴───subscribe───────────────┘
                                         task.assigned
                                         task.statusChanged
                                         comment.added
```

## Service Details

### 1. User Service (`src/services/user-service.ts`)

**Responsibilities:**
- Create, read, update, delete users
- Maintain user information (name, email)

**Store:** In-memory Map of users

**Public Methods:**
- `create(name: string, email: string): User`
- `getById(id: string): User | undefined`
- `listAll(): User[]`
- `update(id: string, updates: Partial): User | undefined`
- `delete(id: string): boolean`

**Events:** None published (no inter-service communication needed)

---

### 2. Project Service (`src/services/project-service.ts`)

**Responsibilities:**
- Create, read, update, delete projects
- Manage project membership (add/remove members)

**Store:** In-memory Map of projects

**Public Methods:**
- `create(name: string, description: string): Project`
- `getById(id: string): Project | undefined`
- `listAll(): Project[]`
- `update(id: string, updates: Partial): Project | undefined`
- `delete(id: string): boolean`
- `addMember(projectId: string, userId: string): Project | undefined`
- `removeMember(projectId: string, userId: string): Project | undefined`

**Events:** None published

---

### 3. Task Service (`src/services/task-service.ts`)

**Responsibilities:**
- Create, read, update, delete tasks
- Enforce forward-only status transitions: `todo` → `in-progress` → `done`
- Assign tasks to users
- Publish events for assignments and status changes

**Store:** In-memory Map of tasks

**Public Methods:**
- `create(title: string, description: string, projectId: string): Task`
- `getById(id: string): Task | undefined`
- `listByProject(projectId: string): Task[]`
- `listAll(): Task[]`
- `update(id: string, updates: Partial): Task | undefined`
- `delete(id: string): boolean`
- `changeStatus(id: string, newStatus: TaskStatus): Task | undefined`
- `assign(id: string, assigneeId: string): Task | undefined`

**Events Published:**
- `task.assigned` - When a task is assigned to a user
- `task.statusChanged` - When a task status changes

**Validation Rules:**
- Status transitions must follow: `todo` → `in-progress` → `done`
- No backward transitions allowed
- Invalid transitions return `undefined`

---

### 4. Comment Service (`src/services/comment-service.ts`)

**Responsibilities:**
- Create, read, delete comments on tasks
- Publish events when comments are added

**Store:** In-memory Map of comments

**Public Methods:**
- `create(taskId: string, authorId: string, body: string, taskTitle?: string, authorName?: string): Comment`
- `getById(id: string): Comment | undefined`
- `listByTask(taskId: string): Comment[]`
- `listAll(): Comment[]`
- `delete(id: string): boolean`

**Events Published:**
- `comment.added` - When a comment is added to a task

---

### 5. Notification Service (`src/services/notification-service.ts`)

**Responsibilities:**
- Create notifications automatically via event subscriptions
- Manage notification read status
- Store user notifications

**Store:** In-memory Map of notifications

**Public Methods:**
- `getById(id: string): Notification | undefined`
- `listByUser(userId: string): Notification[]`
- `listAll(): Notification[]`
- `markAsRead(id: string): Notification | undefined`

**Events Subscribed To:**
- `task.assigned` - Creates notification for assigned user
- `task.statusChanged` - Creates notification for assignee
- `comment.added` - (Available for future expansion)

**Implementation Note:**
The constructor subscribes to events via the event bus. Whenever a task is assigned or a status changes, the notification service automatically creates and stores a notification for the affected user.

---

## Event Bus (`src/event-bus.ts`)

**Purpose:** Central pub/sub system for inter-service communication

**Interface:**
```typescript
class EventBus {
  publish(event: string, payload: any): void
  subscribe(event: string, callback: (payload: any) => void): void
}
```

**Key Features:**
- Singleton instance: `eventBus` (exported for service initialization)
- Supports multiple subscribers per event
- Automatic error handling for subscriber failures
- Loosely coupled services: publishers don't know subscribers

**Events in System:**

| Event Name | Publisher | Payload | Subscribers |
|------------|-----------|---------|-------------|
| `task.assigned` | TaskService.assign() | `{ taskId, taskTitle, assigneeId }` | NotificationService |
| `task.statusChanged` | TaskService.changeStatus() | `{ taskId, taskTitle, assigneeId, oldStatus, newStatus }` | NotificationService |
| `comment.added` | CommentService.create() | `{ commentId, taskId, taskTitle, authorId, authorName }` | NotificationService |

---

## API Router (`src/router.ts`)

**Purpose:** Single entry point for all HTTP requests

**Responsibilities:**
- Route requests to appropriate services
- Parse JSON request bodies
- Format JSON responses
- Handle CORS headers
- Return proper HTTP status codes

**Route Matching:**
Routes are matched by method and path pattern using string matching on path segments.

**Error Handling:**
- 400 Bad Request - Invalid input or transitions
- 404 Not Found - Resource not found
- 500 Internal Server Error - Unexpected errors

**Response Format:**
All responses are JSON:
- Success: `{ data: {...} }` with appropriate status code
- Error: `{ error: "message" }` with error status code

---

## Main Entry Point (`src/main.ts`)

**Responsibilities:**
- Create HTTP server
- Listen on configured port (default 3000)
- Handle graceful shutdown (SIGTERM)

**Environment Variables:**
- `PORT` - Server port (default: 3000)

---

## Demo Script (`src/demo.ts`)

**Purpose:** Comprehensive end-to-end test of the entire system

**Demonstrates:**
1. Creating multiple users
2. Creating a project and adding members
3. Creating tasks within the project
4. Assigning tasks to users (triggers `task.assigned` event)
5. Changing task statuses through valid transitions (triggers `task.statusChanged` event)
6. Adding comments (triggers `comment.added` event)
7. Verifying notifications were automatically created
8. Marking notifications as read

**Output:** Formatted console output showing each step with status indicators (✓, ✓, ✓, etc.)

---

## Data Storage

All services use in-memory storage with the following characteristics:

- **Storage Type:** JavaScript `Map<string, T>`
- **Scope:** Service-local, not shared
- **Lifetime:** Process memory (cleared on restart)
- **Thread Safety:** Single-threaded Node.js, so atomic for practical purposes

### ID Generation

Each service generates IDs with a counter and service prefix:
- User Service: `user-1`, `user-2`, ...
- Project Service: `project-1`, `project-2`, ...
- Task Service: `task-1`, `task-2`, ...
- Comment Service: `comment-1`, `comment-2`, ...
- Notification Service: `notification-1`, `notification-2`, ...

### Data Ownership

```
UserService owns:     User data only
ProjectService owns:  Project and member data only
TaskService owns:     Task and assignment data only
CommentService owns:  Comment data only
NotificationService:  Notification data only
```

No service may read or write another service's store.

---

## Constraint Compliance

### ✓ No Direct Service-to-Service Calls
Services do not import or call each other. All communication goes through the event bus.

### ✓ Data Ownership
Each service exclusively owns its store. No cross-service data access.

### ✓ Single Entry Point
All HTTP handling is in the API Router. Services expose methods only.

### ✓ Forward-Only Status Transitions
Task status must follow `todo` → `in-progress` → `done`. No backward transitions.

### ✓ No External Dependencies
Application code uses only Node.js built-in modules (http, url, etc.).

### ✓ Each Service in Its Own File
- `user-service.ts`
- `project-service.ts`
- `task-service.ts`
- `comment-service.ts`
- `notification-service.ts`
- Plus: `event-bus.ts`, `router.ts`, `main.ts`

---

## Adding a New Service

To add a new service that reacts to existing events:

1. Create `src/services/new-service.ts` with:
   - Private store (Map)
   - Public methods for CRUD operations
   - Constructor that subscribes to desired events

2. Update `src/router.ts` to add routes for the new service

3. Add event subscriptions in the new service's constructor

**Example:**
```typescript
class AnalyticsService {
  private store: Map<string, Metric> = new Map();
  
  constructor() {
    eventBus.subscribe('task.statusChanged', (payload) => {
      this.recordMetric('task_status_change', payload);
    });
  }
  
  private recordMetric(event: string, data: any): void {
    const metric: Metric = { ...data, timestamp: new Date() };
    this.store.set(Date.now().toString(), metric);
  }
}
```

Existing services require **zero changes** because they don't know about the new subscriber.

---

## Performance Characteristics

- **User CRUD:** O(1) Map operations
- **Task Lookup:** O(n) for project queries, O(1) for ID lookup
- **Comment Lookup:** O(n) for task queries, O(1) for ID lookup
- **Event Publishing:** O(m) where m is number of subscribers
- **Memory:** O(n) where n is total entities stored

For a small production system, this is acceptable. For scale, replace in-memory Maps with a database.

---

## Testing Considerations

The demo script (`npm run demo`) provides end-to-end testing of:
- User creation and retrieval
- Project management with members
- Task lifecycle (create → assign → status changes)
- Comment creation
- Event-driven notification generation
- Notification status management

For unit testing, each service can be tested independently without others.

---

## Future Enhancements

Possible extensions without violating architecture:

1. **Database Persistence** - Replace Maps with database queries
2. **Real-time WebSocket Updates** - Emit events to connected clients
3. **Permission System** - Add authorization checks in router
4. **Task Templates** - New service subscribing to project creation
5. **Analytics Service** - New service tracking metrics via events
6. **Audit Logging** - New service logging all events
7. **Email Notifications** - Extend notification service with email adapter

All can be added without modifying existing services.
