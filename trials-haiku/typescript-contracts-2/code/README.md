# Task Management API

A TypeScript Task Management API built with Node.js built-in modules only, following strict architectural rules and an event-driven architecture.

## Architecture Overview

This system implements:

1. **Event Bus Pattern**: All inter-service communication happens through an event bus
2. **Service-Owned Data**: Each service maintains its own in-memory data store
3. **Strict Lifecycle Rules**: Task status follows a one-way state machine (todo → in-progress → done)
4. **HTTP-Only Router**: HTTP handling is isolated to the router layer

## Architecture Rules Enforced

- **RULE 1 - NO_CROSS_SERVICE_IMPORTS**: Services communicate only through the Event Bus
- **RULE 2 - EXCLUSIVE_DATA_OWNERSHIP**: Each service owns and maintains its own data store
- **RULE 3 - HTTP_ONLY_IN_ROUTER**: HTTP operations are isolated to the router layer
- **RULE 4 - FORWARD_ONLY_STATUS**: Task transitions are strictly enforced: todo → in-progress → done
- **RULE 5 - NO_EXTERNAL_PACKAGES**: Only Node.js built-in modules used
- **RULE 6 - ONE_SERVICE_PER_FILE**: Each service has its own file with clear boundaries

## Project Structure

```
src/
├── event-bus.ts           # Event Bus implementation
├── types.ts               # Shared type definitions
├── services/
│   ├── user-service.ts       # User Service
│   ├── project-service.ts    # Project Service
│   ├── task-service.ts       # Task Service (with state machine)
│   ├── comment-service.ts    # Comment Service
│   └── notification-service.ts  # Notification Service
├── router.ts              # HTTP Router (handles all HTTP requests/responses)
├── main.ts                # Entry point & event wiring
└── demo.ts                # Demo script
```

## Running the System

### Start the Server

```bash
npm install
npm start
```

The server starts on `http://localhost:3000`

### Run the Demo

```bash
npm run demo
```

The demo script exercises all features:
- Create users and projects
- Add project members
- Create and assign tasks
- Track notifications via event bus
- Change task status with state machine enforcement
- Add comments and verify comment notifications
- Test invalid state transitions

## API Routes

### Users
- `GET /users` - List all users
- `POST /users` - Create user
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Projects
- `GET /projects` - List all projects
- `POST /projects` - Create project
- `GET /projects/:id` - Get project by ID
- `PUT /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project
- `POST /projects/:id/members` - Add project member
- `DELETE /projects/:id/members` - Remove project member

### Tasks
- `GET /tasks?projectId=X` - Get tasks by project
- `POST /tasks` - Create task
- `GET /tasks/:id` - Get task by ID
- `PUT /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task
- `PUT /tasks/:id/assign` - Assign task to user
- `PUT /tasks/:id/status` - Change task status

### Comments
- `GET /comments?taskId=X` - Get comments by task
- `POST /comments` - Create comment
- `GET /comments/:id` - Get comment by ID
- `DELETE /comments/:id` - Delete comment

### Notifications
- `GET /notifications?userId=X` - Get notifications for user
- `PUT /notifications/:id/read` - Mark notification as read

## Event Flow

The system publishes and subscribes to the following events:

### Task Service publishes:
- `task.assigned` - When a task is assigned to a user
- `task.statusChanged` - When a task status changes

### Comment Service publishes:
- `comment.added` - When a comment is added to a task

### Notification Service subscribes to:
- `task.assigned` - Creates: "Task '{title}' assigned to you"
- `task.statusChanged` - Creates: "Task '{title}' status changed to {status}"
- `comment.added` - Creates notification for task assignee about new comment

## Example Usage

```typescript
// Create a user
POST /users
{ "name": "Alice", "email": "alice@example.com" }

// Create a project
POST /projects
{ "name": "Website", "description": "Redesign website" }

// Add member to project
POST /projects/{projectId}/members
{ "userId": "{userId}" }

// Create a task
POST /tasks
{ "title": "Design", "description": "Create mockups", "projectId": "{projectId}" }

// Assign task
PUT /tasks/{taskId}/assign
{ "assigneeId": "{userId}" }

// Check notifications
GET /notifications?userId={userId}

// Change status (todo → in-progress)
PUT /tasks/{taskId}/status
{ "status": "in-progress" }

// Change status (in-progress → done)
PUT /tasks/{taskId}/status
{ "status": "done" }
```

## State Machine

Task status transitions are strictly enforced:

```
todo → in-progress → done
```

- Valid forward transitions only
- Cannot skip transitions (todo → done is invalid)
- Cannot go backward (done → in-progress is invalid)
- Attempting invalid transitions throws an error

## Design Principles

1. **Pure Services**: Services contain only business logic, no HTTP handling
2. **Event-Driven**: Services communicate asynchronously through events
3. **Data Isolation**: No service can access another service's data store
4. **Self-Contained**: Zero external npm dependencies for application code
5. **Type Safety**: Full TypeScript with strict mode enabled
