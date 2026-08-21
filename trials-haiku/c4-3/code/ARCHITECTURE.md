# Task Management API - Architecture Documentation

## Overview

This document describes the architecture of the Task Management API system based on the C4 Model.

## C4 Level 1: System Context

```
┌─────────────────────────────────────────────────────────────────┐
│ Task Management System                                          │
│                                                                 │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ API Router                                               │  │
│ │ (HTTP entry point, delegates to services)               │  │
│ └────────────┬───────────────────────────────────────────┬┘  │
│              │                                             │   │
│     ┌────────▼────────┬──────────────────────────────┬───▼──┐│
│     │                │                                │      ││
│  ┌──▼──┐  ┌──────┐  ┌──────┐  ┌─────────┐  ┌──────┐│      ││
│  │User │  │Project│ │Task  │  │Comment  │  │Notif ││      ││
│  │Svc  │  │Svc    │ │Svc   │  │Svc      │  │Svc   ││      ││
│  └─────┘  └───────┘ └─────┬┘  └────┬────┘  └──────┘│      ││
│                             │        │               │      ││
│                      ┌──────▼────────▼────────────┐ │      ││
│                      │  Event Bus                 │ │      ││
│                      │  (pub/sub)                 │ │      ││
│                      └─────────────────────────────┘│      ││
│                                                     │      ││
│                      Data Stores (in-memory Maps)  │      ││
│     Maps for Users, Projects, Tasks, Comments, Notifications
└─────────────────────────────────────────────────────────────┘
           ▲
           │ HTTP Requests
           │
        User
```

## Services

### 1. User Service
**Responsibility**: Manage user CRUD operations

**Operations**:
- `create(name, email): User`
- `getById(id): User | null`
- `getAll(): User[]`
- `update(id, updates): User | null`
- `delete(id): boolean`

**Events Published**: None
**Events Subscribed**: None
**Data**: In-memory Map<string, User>

### 2. Project Service
**Responsibility**: Manage projects and team membership

**Operations**:
- `create(name, description): Project`
- `getById(id): Project | null`
- `getAll(): Project[]`
- `update(id, updates): Project | null`
- `delete(id): boolean`
- `addMember(projectId, userId): Project | null`
- `removeMember(projectId, userId): Project | null`

**Events Published**: None
**Events Subscribed**: None
**Data**: In-memory Map<string, Project>

### 3. Task Service
**Responsibility**: Manage task lifecycle and status transitions

**Operations**:
- `create(title, description, projectId): Task`
- `getById(id): Task | null`
- `getByProject(projectId): Task[]`
- `update(id, updates): Task | null`
- `delete(id): boolean`
- `assign(id, assigneeId): Task | null`
- `changeStatus(id, newStatus): Task | null`

**Status Transitions**: `todo → in-progress → done` (enforced)

**Events Published**:
- `task.assigned`: { taskId, taskTitle, assigneeId, oldAssigneeId }
- `task.statusChanged`: { taskId, taskTitle, assigneeId, oldStatus, newStatus }

**Events Subscribed**: None
**Data**: In-memory Map<string, Task>

### 4. Comment Service
**Responsibility**: Manage comments on tasks

**Operations**:
- `create(taskId, authorId, body): Comment | null`
- `getById(id): Comment | null`
- `getByTask(taskId): Comment[]`
- `delete(id): boolean`

**Events Published**:
- `comment.added`: { commentId, taskId, taskTitle, authorId, authorName }

**Events Subscribed**: None
**Data**: In-memory Map<string, Comment>

### 5. Notification Service
**Responsibility**: Create and manage notifications based on events

**Operations**:
- `getByUser(userId): Notification[]`
- `markAsRead(id): Notification | null`

**Events Subscribed**:
- `task.assigned` → Creates notification: "Task 'X' has been assigned to you"
- `task.statusChanged` → Creates notification: "Task 'X' status changed to Y"
- Comment events → Creates notification: "User 'X' commented on task 'Y'" (via router)

**Data**: In-memory Map<string, Notification>

## Event Bus

The Event Bus is the central communication mechanism for inter-service interactions.

**Interface**:
```typescript
class EventBus {
  subscribe(event: string, callback: (payload: any) => void): void
  publish(event: string, payload: any): void
}
```

**Design Principles**:
- Services publish events when domain actions occur
- Other services subscribe to events they care about
- Completely decouples publishers and subscribers
- Error handling prevents one failed subscriber from affecting others

## API Router

The API Router is the single entry point for all HTTP requests.

**Responsibilities**:
- Parse incoming HTTP requests
- Route requests to appropriate service methods
- Handle request/response serialization (JSON)
- Coordinate inter-service concerns (e.g., comment notifications)
- Error handling and HTTP status codes

**Design Pattern**: Request Handler with Regex-based Routing

## Data Ownership

Each service exclusively owns its data store:

```
User Service     → Users Map
Project Service  → Projects Map
Task Service     → Tasks Map
Comment Service  → Comments Map
Notification Service → Notifications Map
```

**Benefits**:
- Clear ownership and responsibility
- Prevents accidental cross-service data modification
- Each service controls its own invariants
- Easy to understand data flow

## Event Flow Examples

### Example 1: Assigning a Task

```
1. Client: PUT /tasks/:id/assign { assigneeId: "user-123" }
2. Router: Calls taskService.assign(taskId, { assigneeId })
3. Task Service: 
   - Updates task.assigneeId
   - Calls eventBus.publish("task.assigned", {...})
4. Event Bus:
   - Calls all subscribers of "task.assigned"
5. Notification Service:
   - Receives task.assigned event
   - Creates notification for assignee
6. Router: Returns updated task to client
```

### Example 2: Adding a Comment

```
1. Client: POST /comments { taskId: "...", authorId: "...", body: "..." }
2. Router: Calls commentService.create(...)
3. Comment Service:
   - Validates task and author exist
   - Creates comment
   - Calls eventBus.publish("comment.added", {...})
4. Event Bus:
   - Calls subscribers (none currently)
5. Router:
   - Gets task from taskService
   - Calls notificationService.notifyTaskAssigneeOnComment(...)
   - Notification Service creates notification for assignee
6. Router: Returns created comment to client
```

### Example 3: Changing Task Status

```
1. Client: PUT /tasks/:id/status { status: "in-progress" }
2. Router: Calls taskService.changeStatus(taskId, { status })
3. Task Service:
   - Validates status transition is valid
   - Updates task.status
   - Calls eventBus.publish("task.statusChanged", {...})
4. Event Bus:
   - Calls all subscribers
5. Notification Service:
   - Receives task.statusChanged event
   - Creates notification for assignee
6. Router: Returns updated task to client
```

## Architectural Constraints

### 1. No Direct Service-to-Service Calls
**Rule**: Services MUST NOT import or call other services directly.

**Enforcement**:
- Services only import the event bus
- The router is the only place that calls services
- The router is the only place that coordinates multiple services

**Benefit**: Complete decoupling, easy to test

### 2. Data Ownership
**Rule**: Each service exclusively owns its data store.

**Enforcement**:
- Services only have access to their own data Map
- Services validate references via the data they receive (not by querying other services)

**Benefit**: Clear boundaries, no shared mutable state

### 3. Single Entry Point
**Rule**: All HTTP handling is in the API Router.

**Enforcement**:
- Services are plain TypeScript classes with methods
- Services don't know about HTTP
- No HTTP framework is used in services

**Benefit**: Clean separation of concerns

### 4. Forward-Only Status Transitions
**Rule**: Task status follows `todo → in-progress → done`

**Enforcement**:
- TaskService validates transitions in changeStatus()
- Throws error on invalid transitions
- Enforced before publishing events

**Benefit**: Data consistency, clear workflow

### 5. No External Dependencies
**Rule**: Only Node.js built-in modules for the application code.

**Enforcement**:
- Using: `http`, `crypto`, `url`, `net` modules
- No npm packages in application code
- Dev tools (TypeScript, tsx) are allowed

**Benefit**: Minimal setup, no supply chain risk

## Type Safety

The system is fully typed with TypeScript:

```typescript
// Services export their interfaces
export interface User { ... }
export interface CreateUserRequest { ... }

// Router imports and uses types
import { userService, CreateUserRequest } from "./services/user-service"

// Compile-time verification of types
const body = await parseRequestBody(req) as CreateUserRequest
```

**Benefits**:
- Catch errors at compile time
- IDE autocompletion and documentation
- Self-documenting code

## Error Handling

### Service Level
- Services return null for "not found" cases
- Services throw errors for validation failures
- Errors propagate to the router

### Router Level
- Catches all errors from services
- Returns appropriate HTTP status codes:
  - 200: Success
  - 201: Created
  - 400: Bad request
  - 404: Not found
  - 500: Server error
- Serializes errors as JSON

### Event Bus Level
- Catches errors in event subscribers
- Logs errors but doesn't propagate
- Allows other subscribers to continue

## Testing Strategy

**Unit Testing**:
```typescript
// Test service logic without HTTP
const service = new UserService()
const user = service.create({ name: "Alice", email: "alice@test.com" })
assert(user.id !== undefined)
assert(user.name === "Alice")
```

**Integration Testing**:
```typescript
// Test service interactions via events
const bus = new EventBus()
const notifications: any[] = []
bus.subscribe("task.assigned", (payload) => {
  notifications.push(payload)
})
// ... trigger task assignment ...
assert(notifications.length === 1)
```

**End-to-End Testing**:
```typescript
// Test full HTTP flow
const response = await fetch("http://localhost:3000/users", {
  method: "POST",
  body: JSON.stringify({ name: "Alice", email: "alice@test.com" })
})
const { user } = await response.json()
assert(user.id !== undefined)
```

## Deployment Considerations

### In-Memory Storage
- Data is lost on server restart
- Suitable for: demos, prototypes, development
- For production: replace Maps with database

### Scalability
- Single process only
- For scaling: extract services to separate processes
- Use message broker (Redis, RabbitMQ) instead of in-memory Event Bus

### Observability
- Add logging to event bus
- Log service operations
- Monitor event latencies

### Example Migration Path
1. Keep service interfaces the same
2. Replace in-memory Maps with database queries
3. Extract event bus to external message broker
4. Separate services to different processes
5. Maintain same API contracts
